import {
    db,
    collection,
    onSnapshot,
    doc,
    getDocs,
    getDoc,
    deleteDoc,
    setDoc,
    serverTimestamp
} from "./firebase.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const TEMPO_TRAVA_IMPRESSAO = 30000;

const impressoesAutomaticasEmAndamento =
    new Set();


// =====================================================
// CONFIGURAÇÃO PADRÃO DA IMPRESSORA
// =====================================================

const CONFIGURACAO_IMPRESSAO_PADRAO = {

    larguraPapel: 80,

    numeroVias: 1,

    mostrarGarcom: true,

    mostrarMesa: true,

    mostrarComanda: true,

    mostrarHorario: true,

    mostrarPrecos: true,

    tamanhoFonteProducao: "grande",

    negritoProducao: true

};

// =====================================================
// CARREGAR CONFIGURAÇÃO DA IMPRESSORA
// =====================================================

async function obterConfiguracaoImpressao() {

    try {

        const referencia =
            doc(
                db,
                "configuracoes",
                "impressora"
            );


        const snapshot =
            await getDoc(
                referencia
            );


        if (
            snapshot.exists()
        ) {

            return {

                ...CONFIGURACAO_IMPRESSAO_PADRAO,

                ...snapshot.data()

            };

        }


    } catch (erro) {

        console.warn(
            "Não foi possível carregar as configurações da impressora. Usando padrão.",
            erro
        );

    }


    return {
        ...CONFIGURACAO_IMPRESSAO_PADRAO
    };
}


// =====================================================
// FORMATAÇÃO DE VALOR
// =====================================================

function formatarValor(valor) {

    return Number(
        valor || 0
    )
        .toFixed(2)
        .replace(".", ",");
}


// =====================================================
// ESCAPAR TEXTO PARA IMPRESSÃO
// =====================================================

function escaparHTML(texto) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return "";

    }


    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// TRAVA CONTRA IMPRESSÃO DUPLICADA
// =====================================================

function adquirirTravaImpressao(chave) {

    const agora = Date.now();

    try {

        const existente =
            localStorage.getItem(
                "hotelBau_impressao_" + chave
            );


        if (existente) {

            const tempo =
                Number(existente);


            if (
                agora - tempo <
                TEMPO_TRAVA_IMPRESSAO
            ) {

                return false;

            }

        }


        localStorage.setItem(
            "hotelBau_impressao_" + chave,
            String(agora)
        );


        return true;

    } catch (erro) {

        console.error(
            "Erro ao criar trava de impressão:",
            erro
        );

        return true;
    }
}


function liberarTravaImpressao(chave) {

    try {

        localStorage.removeItem(
            "hotelBau_impressao_" + chave
        );

    } catch (erro) {

        console.error(
            "Erro ao liberar trava de impressão:",
            erro
        );

    }
}



async function abrirImpressao(
    conteudo,
    configuracao = CONFIGURACAO_IMPRESSAO_PADRAO
) {
    // Carrega a biblioteca QZ Tray somente uma vez por página.
    if (!window.qz) {
        if (!window.__hotelBauQZScriptPromise) {
            window.__hotelBauQZScriptPromise = new Promise(
                (resolve, reject) => {
                    const script = document.createElement("script");

                    script.src = new URL(
                        "./lib/qz-tray.js",
                        import.meta.url
                    ).href;

                    script.onload = () => {
                        if (window.qz) {
                            resolve(window.qz);
                        } else {
                            reject(
                                new Error(
                                    "A biblioteca QZ Tray não foi carregada."
                                )
                            );
                        }
                    };

                    script.onerror = () => {
                        reject(
                            new Error(
                                "Não foi possível carregar js/lib/qz-tray.js."
                            )
                        );
                    };

                    document.head.appendChild(script);
                }
            ).catch(erro => {
                window.__hotelBauQZScriptPromise = null;
                throw erro;
            });
        }

        await window.__hotelBauQZScriptPromise;
    }

    const qzTray = window.qz;

    if (!qzTray) {
        throw new Error("QZ Tray não está disponível.");
    }

    // Configura certificado e assinatura antes de conectar.
    if (!window.__hotelBauQZSecurityConfigured) {
        qzTray.security.setCertificatePromise(
            function(resolve, reject) {
                fetch("http://127.0.0.1:8183/certificate", {
                    cache: "no-store",
                    targetAddressSpace: "loopback"
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(
                            "Não foi possível carregar o certificado."
                        );
                    }

                    return response.text();
                })
                .then(resolve)
                .catch(reject);
            }
        );

        qzTray.security.setSignatureAlgorithm("SHA512");

        qzTray.security.setSignaturePromise(function(toSign) {
            return function(resolve, reject) {
                fetch("http://127.0.0.1:8183/sign", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    cache: "no-store",
                    targetAddressSpace: "loopback",
                    body: JSON.stringify({
                        request: toSign
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(
                            "Não foi possível assinar a solicitação."
                        );
                    }

                    return response.text();
                })
                .then(resolve)
                .catch(reject);
            };
        });

        window.__hotelBauQZSecurityConfigured = true;
    }

    // Conecta ao QZ Tray sem abrir conexões concorrentes.
    if (!qzTray.websocket.isActive()) {
        if (!window.__hotelBauQZConnectPromise) {
            window.__hotelBauQZConnectPromise =
                qzTray.websocket.connect().catch(erro => {
                    window.__hotelBauQZConnectPromise = null;
                    throw erro;
                });
        }

        try {
            await window.__hotelBauQZConnectPromise;
        } finally {
            if (qzTray.websocket.isActive()) {
                window.__hotelBauQZConnectPromise = null;
            }
        }
    }

    // Localiza e memoriza a impressora POS-80.
    let impressora = window.__hotelBauQZPrinter;

    if (!impressora) {
        if (!window.__hotelBauQZFindPrinterPromise) {
            window.__hotelBauQZFindPrinterPromise =
                qzTray.printers.find()
                    .then(resultado => {
                        const nomes = Array.isArray(resultado)
                            ? resultado
                            : [resultado];

                        const encontrada = nomes.find(nome =>
                            String(nome)
                                .toUpperCase()
                                .includes("POS-80")
                        );

                        if (!encontrada) {
                            throw new Error(
                                "Impressora POS-80 não encontrada."
                            );
                        }

                        window.__hotelBauQZPrinter = encontrada;

                        return encontrada;
                    })
                    .catch(erro => {
                        window.__hotelBauQZFindPrinterPromise = null;
                        throw erro;
                    });
        }

        try {
            impressora =
                await window.__hotelBauQZFindPrinterPromise;
        } finally {
            window.__hotelBauQZFindPrinterPromise = null;
        }
    }

    // Mantém o papel de 80 mm e a quantidade configurada de vias.
    const larguraPapel =
        Number(configuracao.larguraPapel) === 80 ? 80 : 80;

    const larguraConteudo = larguraPapel - 8;

    const numeroVias = Math.max(
        1,
        Math.min(
            2,
            Number(configuracao.numeroVias) || 1
        )
    );

    let conteudoFinal = "";

    for (let via = 1; via <= numeroVias; via++) {
        conteudoFinal += `
            <div class="via-impressao">
                ${conteudo}
            </div>
        `;

        if (via < numeroVias) {
            conteudoFinal += `
                <div class="quebra-via"></div>
            `;
        }
    }

    // Monta o documento HTML que será enviado diretamente ao QZ Tray.
    const documentoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">

            <style>
                @page {
                    size: ${larguraPapel}mm auto;
                    margin: 3mm;
                }

                html,
                body {
                    margin: 0;
                    padding: 0;
                    width: ${larguraConteudo}mm;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    color: #000;
                }

                body {
                    padding-bottom: 10px;
                }

                .central {
                    text-align: center;
                }

                .separador {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }

                .identificacao-print {
                    font-weight: bold;
                    font-size: 14px;
                }

                .mesa-print {
                    font-weight: bold;
                    font-size: 15px;
                    margin-top: 4px;
                }

                .linha-item-impressao {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    margin: 4px 0;
                }

                .item-producao {
                    font-size: 13px;
                    margin: 4px 0;
                }

                .obs {
                    margin-top: 8px;
                    font-size: 12px;
                }

                .total-impressao {
                    font-weight: bold;
                    font-size: 15px;
                    margin-top: 8px;
                }

                .quebra-via {
                    page-break-after: always;
                    break-after: page;
                    height: 1px;
                }

                .via-impressao {
                    width: 100%;
                }
            </style>
        </head>

        <body>
            ${conteudoFinal}
        </body>
        </html>
    `;

    const configuracaoQZ = qzTray.configs.create(
        impressora,
        {
            size: {
                width: larguraPapel
            },
            units: "mm",
            margins: 3
        }
    );

    const dadosImpressao = [
        {
            type: "pixel",
            format: "html",
            flavor: "plain",
            data: documentoHTML
        }
    ];

    // Só considera concluído quando o QZ Tray aceitar o envio.
    await qzTray.print(
        configuracaoQZ,
        dadosImpressao
    );
}



// =====================================================
// IDENTIFICAÇÃO DA MESA / QUARTO
// =====================================================

function obterIdentificacao(pedido) {

    const tipo =
        pedido.tipo === "quarto"
            ? "QUARTO"
            : "MESA";


    const numero =
        pedido.quarto ||
        pedido.mesa ||
        pedido.numero;


    return {

        tipo,

        numero

    };
}


// =====================================================
// IMPRESSÃO DA PRODUÇÃO
// =====================================================

async function imprimirGarcom(
    pedido,
    automatica = false
) {

    if (
        !pedido ||
        !Array.isArray(pedido.itens)
    ) {

        console.warn(
            "Pedido inválido para impressão:",
            pedido
        );

        return;

    }


    const configuracao =
        await obterConfiguracaoImpressao();

    const tamanhosFonteProducao = {

    pequena: "11px",

    normal: "12px",

    grande: "16px",

    extragrande: "18px"

};


const tamanhoFonteProducao =
    tamanhosFonteProducao[
        configuracao.tamanhoFonteProducao
    ] || "16px";


const pesoFonteProducao =
    configuracao.negritoProducao
        ? "700"
        : "400";


    const {
        tipo,
        numero
    } =
        obterIdentificacao(
            pedido
        );


   let conteudo = `

    <div
        class="impressao-producao"
        style="
            font-size: ${tamanhoFonteProducao};
            font-weight: ${pesoFonteProducao};
        "
    >

        <div class="central">

            <div
                class="identificacao-print"
                style="font-size: 1.15em;"
            >
                HOTEL DO BAÚ
            </div>

            <div>
                PRODUÇÃO
            </div>

        </div>

        <div class="separador"></div>

`;

    // =================================================
    // MESA / QUARTO
    // =================================================

    if (
        configuracao.mostrarMesa
    ) {

        conteudo += `

            <div class="central">

                <div class="mesa-print">

                    ${escaparHTML(tipo)}
                    ${String(numero).padStart(2, "0")}

                </div>

            </div>

        `;

    }


    // =================================================
    // COMANDA
    // =================================================

    if (
        configuracao.mostrarComanda
    ) {

        conteudo += `

            <div class="central">

                Pedido #${
                    escaparHTML(
                        pedido.numeroPedido || ""
                    )
                }

            </div>

        `;

    }


    // =================================================
    // GARÇOM
    // =================================================

    if (
        configuracao.mostrarGarcom
    ) {

        conteudo += `

            <div
                class="central"
                style="
                    margin-top: 6px;
                    font-weight: bold;
                "
            >

                GARÇOM:
                ${
                    escaparHTML(
                        pedido.garcomNome ||
                        "Não informado"
                    )
                }

            </div>

        `;

    }


    conteudo += `

        <div class="separador"></div>

    `;


    // =================================================
    // ITENS
    // =================================================

  
pedido.itens.forEach(
    item => {

        const quantidade =
            Number(
                item.quantidade || 0
            );

        const nome =
            escaparHTML(
                item.nome
            );

        conteudo += `

            <div
                class="item-producao"
                style="
                    font-size: 1.3em;
                    font-weight: 700;
                    margin-bottom: 20px;
                "
            >
                ${quantidade} x ${nome}
            </div>

        `;

    }
);



    // =================================================
    // OBSERVAÇÃO
    // =================================================

    if (
        pedido.observacao
    ) {

        conteudo += `

            <div class="separador"></div>

           
<div
    class="obs"
    style="
        font-size: 1.3em;
        font-weight: 700;
        line-height: 1.4;
        margin-top: 4px;
        overflow-wrap: anywhere;
    "
>
    <strong>OBSERVAÇÃO:</strong>

    <br>

    ${escaparHTML(
        pedido.observacao
    )}
</div>

        `;

    }


    // =================================================
    // HORÁRIO
    // =================================================

    if (
        configuracao.mostrarHorario
    ) {

        conteudo += `

            <div class="separador"></div>

            <div class="central">

                ${
                    escaparHTML(
                        pedido.dataHora || ""
                    )
                }

            </div>

        `;

    }
    
conteudo += `

    </div>

`;

    await abrirImpressao(
        conteudo,
        configuracao
    );


    // =================================================
    // REMOVE DA FILA DE PRODUÇÃO
    // =================================================

    if (
        pedido.id
    ) {

        try {

            await deleteDoc(

                doc(
                    db,
                    "pedidos_producao",
                    pedido.id
                )

            );


            console.log(
                "Pedido removido da fila de produção:",
                pedido.id
            );


        } catch (erro) {

            console.error(
                "Erro ao remover pedido da fila:",
                erro
            );

        }

    }

}


// =====================================================
// IMPRESSÃO DO CONSUMO ACUMULADO
// =====================================================

async function imprimirConsumoMesa(
    pedido,
    automatica = false
) {

    const configuracao =
        await obterConfiguracaoImpressao();


    const {
        tipo,
        numero
    } =
        obterIdentificacao(
            pedido
        );


    const idMesa =
        tipo === "QUARTO"

            ? `quarto_${String(numero).padStart(2, "0")}`

            : `mesa_${String(numero).padStart(2, "0")}`;


    const pedidosSnapshot =
        await getDocs(

            collection(
                db,
                "mesas",
                idMesa,
                "pedidos"
            )

        );


    const pedidos = [];


    pedidosSnapshot.forEach(
        documento => {

            pedidos.push({

                id:
                    documento.id,

                ...documento.data()

            });

        }
    );


    pedidos.sort(
        (a, b) => {

            const tempoA =
                a.criadoEm?.seconds ||
                0;


            const tempoB =
                b.criadoEm?.seconds ||
                0;


            return tempoA - tempoB;

        }
    );


    const itensMap =
        new Map();


    let total = 0;


    pedidos.forEach(
        pedidoMesa => {

            const itens =
                Array.isArray(
                    pedidoMesa.itens
                )

                    ? pedidoMesa.itens

                    : [];


            itens.forEach(
                item => {

                    const chave =
                        String(
                            item.id ??
                            item.nome
                        );


                    if (
                        !itensMap.has(
                            chave
                        )
                    ) {

                        itensMap.set(

                            chave,

                            {

                                id:
                                    item.id,

                                nome:
                                    item.nome,

                                quantidade:
                                    0,

                                preco:
                                    Number(
                                        item.preco ||
                                        0
                                    )

                            }

                        );

                    }


                    const existente =
                        itensMap.get(
                            chave
                        );


                    existente.quantidade +=
                        Number(
                            item.quantidade ||
                            0
                        );

                }
            );


            total +=
                Number(
                    pedidoMesa.total ||
                    0
                );

        }
    );


   
let conteudo = `

    <div
        class="central"
        style="font-weight: 700;"
    >

        <div
            class="identificacao-print"
            style="font-size: 1.3em;"
        >
            HOTEL DO BAÚ
        </div>

        <div
            style="
                font-size: 1.5em;
                font-weight: 700;
                margin-top: 5px;
            "
        >
            CONSUMO ATUAL
        </div>

    </div>

    <div class="separador"></div>

`;



    // =================================================
    // MESA / QUARTO
    // =================================================

    if (
        configuracao.mostrarMesa
    ) {

        conteudo += `

            <div class="central">

                <div class="mesa-print">

                    ${escaparHTML(tipo)}
                    ${String(numero).padStart(2, "0")}

                </div>

            </div>

        `;

    }


    // =================================================
    // COMANDA
    // =================================================

    if (
        configuracao.mostrarComanda &&
        pedido.numeroPedido
    ) {

        conteudo += `

            <div class="central">

                Pedido #${
                    escaparHTML(
                        pedido.numeroPedido
                    )
                }

            </div>

        `;

    }


    // =================================================
    // GARÇOM
    // =================================================

    if (
        configuracao.mostrarGarcom &&
        pedido.garcomNome
    ) {

        conteudo += `

            <div
                class="central"
                style="
                    margin-top: 6px;
                    font-weight: bold;
                "
            >

                GARÇOM:
                ${
                    escaparHTML(
                        pedido.garcomNome
                    )
                }

            </div>

        `;

    }


    conteudo += `

        <div class="separador"></div>

    `;


    // =================================================
    // ITENS
    // =================================================

    itensMap.forEach(
        item => {

            const subtotal =
                item.quantidade *
                item.preco;


            if (
                configuracao.mostrarPrecos
            ) {

                conteudo += `

                   
<div
    class="linha-item-impressao"
    style="
        font-size: 1.2em;
        font-weight: 700;
        margin-bottom: 5px;
        line-height: 1.4;
    "
>


                        <span>

                            ${item.quantidade}
                            x
                            ${escaparHTML(
                                item.nome
                            )}

                        </span>

                        <span>

                            R$
                            ${formatarValor(
                                subtotal
                            )}

                        </span>

                    </div>

                `;

            } else {

                conteudo += `

                    
<div
    class="item-producao"
    style="
        font-size: 1.2em;
        font-weight: 700;
        margin-bottom: 5px;
        line-height: 1.4;
    "
>


                        ${item.quantidade}
                        x
                        ${escaparHTML(
                            item.nome
                        )}

                    </div>

                `;

            }

        }
    );


    // =================================================
    // TOTAL
    // =================================================

    if (
        configuracao.mostrarPrecos
    ) {

        conteudo += `

            <div class="separador"></div>

            
<div
    class="linha-item-impressao"
    style="
        font-size: 1.5em;
        font-weight: 700;
        margin-top: 6px;
        margin-bottom: 6px;
        line-height: 1.4;
    "
>


                <strong>
                    TOTAL
                </strong>

                <strong>

                    R$
                    ${formatarValor(
                        total
                    )}

                </strong>

            </div>

        `;

    }


    // =================================================
    // HORÁRIO
    // =================================================

    if (
        configuracao.mostrarHorario &&
        pedido.dataHora
    ) {

        conteudo += `

            <div class="separador"></div>

            <div class="central">

                ${
                    escaparHTML(
                        pedido.dataHora
                    )
                }

            </div>

        `;

    }


    conteudo += `

        <div class="separador"></div>

       
<div
    class="central"
    style="
        font-size: 1.15em;
        font-weight: 700;
        line-height: 1.5;
        margin-top: 5px;
    "
>
    CONTA PARCIAL

    <br>

    MESA PERMANECE ABERTA
</div>


    `;


   await abrirImpressao(
    conteudo,
    configuracao,
    automatica
);

}


// =====================================================
// IMPRESSÃO AUTOMÁTICA
// =====================================================

async function imprimirPedidoAutomaticamente(
    pedido,
    origem = "garcom"
) {

    if (
        !pedido?.id
    ) {

        return;

    }


    const chave =
        `${origem}:${pedido.id}`;


    if (
        impressoesAutomaticasEmAndamento
            .has(chave)
    ) {

        return;

    }


    if (
        !adquirirTravaImpressao(
            chave
        )
    ) {

        console.log(
            "Impressão já processada:",
            chave
        );

        return;

    }


    impressoesAutomaticasEmAndamento
        .add(chave);


    try {

        await imprimirGarcom(
            pedido,
            true
        );


        await imprimirConsumoMesa(
            pedido,
            true
        );


    } catch (erro) {

        console.error(
            "Erro na impressão automática:",
            erro
        );

    } finally {

        impressoesAutomaticasEmAndamento
            .delete(chave);

        liberarTravaImpressao(
            chave
        );

    }

}


// =====================================================
// MONITORAMENTO DOS PEDIDOS
// =====================================================

onSnapshot(

    collection(
        db,
        "pedidos_producao"
    ),

    snapshot => {

        snapshot.docChanges()
            .forEach(
                alteracao => {

                    if (
                        alteracao.type !== "added"
                    ) {

                        return;

                    }


                    const pedidoNovo = {

                        id:
                            alteracao.doc.id,

                        ...alteracao.doc.data()

                    };


                    console.log(
                        "NOVO PEDIDO PARA IMPRESSÃO:",
                        pedidoNovo
                    );


                    imprimirPedidoAutomaticamente(
                        pedidoNovo,
                        "garcom"
                    );

                }
            );

    },

    erro => {

        console.error(
            "Erro monitorando pedidos para impressão:",
            erro
        );

    }

);



async function imprimirFechamentoAutomaticamente(fechamento) {

    if (!fechamento?.id) {
        return;
    }

    const chaveTrava = `fechamento:${fechamento.id}`;

    // Evita duas impressões simultâneas do mesmo fechamento.
    if (impressoesAutomaticasEmAndamento.has(chaveTrava)) {
        return;
    }

    if (!adquirirTravaImpressao(chaveTrava)) {
        console.log(
            "Impressão do fechamento já está em andamento:",
            fechamento.id
        );
        return;
    }

    impressoesAutomaticasEmAndamento.add(chaveTrava);

    try {

        const referenciaFechamento = doc(
            db,
            "fechamentos",
            fechamento.id
        );

        // Confere o estado atual antes de imprimir.
        const snapshotFechamento = await getDoc(
            referenciaFechamento
        );

        if (!snapshotFechamento.exists()) {
            console.warn(
                "Fechamento não encontrado:",
                fechamento.id
            );
            return;
        }

        const dadosAtuais = snapshotFechamento.data();

        if (dadosAtuais.status !== "novo") {
            console.log(
                "Fechamento não está aguardando impressão:",
                fechamento.id,
                dadosAtuais.status
            );
            return;
        }

        // Usa os dados mais recentes salvos no Firebase.
        fechamento = {
            id: fechamento.id,
            ...dadosAtuais
        };

        console.log(
            "FECHAMENTO PARA IMPRESSÃO:",
            fechamento
        );

        const configuracao =
            await obterConfiguracaoImpressao();

        const ehQuarto = fechamento.tipo === "quarto";

        const nomeLocal = ehQuarto ? "QUARTO" : "MESA";

        const numero = String(
            fechamento.numero || 0
        ).padStart(2, "0");

        const itens = Array.isArray(fechamento.itens)
            ? fechamento.itens
            : [];

    
        // =====================================================
        // MONTAGEM DA CONTA FINAL
        // =====================================================

        let conteudo = `
            <div style="
                font-family: Arial, sans-serif;
                color: #000;
                font-size: 12px;
            ">

                <div style="text-align:center;">

                    <img
                        src="https://hoteldobau.github.io/hotel-pwa/img/logo.jpg"
                        alt="Logo Hotel do Baú"
                        style="
                            display:block;
                            width:100px;
                            max-width:100%;
                            height:auto;
                            margin:0 auto 6px;
                        "
                    >

                    <strong style="font-size:18px;">
                        HOTEL DO BAÚ
                    </strong>

                    <div style="margin-top:5px;line-height:1.5;">
                        Rua Nove de Julho, 177 – Centro
                        <br>
                        Santa Rosa de Viterbo – SP
                        <br>
                        CNPJ: 59.143.158/0001-63
                        <br>
                        Telefone: (16) 9 9159-8910
                        <br>
                        reservas@hoteldobau.com.br
                    </div>

                    <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">

                    <strong style="font-size:17px;">
                        CONTA DE CONSUMO
                    </strong>

                    <div style="font-size:10px;margin-top:4px;">
                        DEMONSTRATIVO DE CONSUMO
                        <br>
                        NÃO É DOCUMENTO FISCAL
                    </div>

                </div>

                <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">
        `;

        // MESA / QUARTO
        if (configuracao.mostrarMesa) {
            conteudo += `
                <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">
                    ${escaparHTML(nomeLocal)} ${escaparHTML(numero)}
                </div>
            `;
        }

        // COMANDA
        const numeroComanda =
            fechamento.numeroComanda ||
            fechamento.comanda ||
            fechamento.numeroPedido ||
            "";

        if (configuracao.mostrarComanda && numeroComanda) {
            conteudo += `
                <div style="margin-bottom:6px;">
                    Comanda: #${escaparHTML(numeroComanda)}
                </div>
            `;
        }

        // GARÇOM
        if (configuracao.mostrarGarcom && fechamento.garcomNome) {
            conteudo += `
                <div style="margin-bottom:6px;">
                    Garçom: ${escaparHTML(fechamento.garcomNome)}
                </div>
            `;
        }

        // ITENS E SUBTOTAIS
        conteudo += `
            <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">
        `;

        itens.forEach(item => {
            const quantidade = Number(item.quantidade || 0);
            const preco = Number(item.preco || 0);
            const subtotalItem = preco * quantidade;

            if (configuracao.mostrarPrecos) {
                conteudo += `
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        gap:6px;
                        font-size:12px;
                        font-weight:bold;
                        line-height:1.4;
                        margin-bottom:7px;
                    ">
                        <span style="flex:1;overflow-wrap:anywhere;">
                            ${quantidade}x ${escaparHTML(item.nome)}
                        </span>

                        <span style="white-space:nowrap;">
                            R$ ${formatarValor(subtotalItem)}
                        </span>
                    </div>
                `;
            } else {
                conteudo += `
                    <div style="font-weight:bold;margin-bottom:7px;line-height:1.4;">
                        ${quantidade}x ${escaparHTML(item.nome)}
                    </div>
                `;
            }
        });

        // SUBTOTAL, DESCONTO E TOTAL
        const subtotal = Number(fechamento.subtotal || 0);
        const desconto = Number(fechamento.desconto || 0);
        const total = Number(fechamento.total || 0);

        if (configuracao.mostrarPrecos) {
            conteudo += `
                <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">

                <div style="line-height:1.8;">
                    <div style="display:flex;justify-content:space-between;gap:6px;">
                        <span>Subtotal</span>
                        <span>R$ ${formatarValor(subtotal)}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;gap:6px;">
                        <span>Desconto</span>
                        <span>R$ ${formatarValor(desconto)}</span>
                    </div>

                    <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        gap:6px;
                        font-size:18px;
                        font-weight:bold;
                    ">
                        <span>TOTAL</span>
                        <span>R$ ${formatarValor(total)}</span>
                    </div>
                </div>
            `;
        }

        // DATA E HORÁRIO
        if (configuracao.mostrarHorario && fechamento.dataHora) {
            conteudo += `
                <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">

                <div style="text-align:center;">
                    ${escaparHTML(fechamento.dataHora)}
                </div>
            `;
        }

      
        // MENSAGEM FINAL
        conteudo += `
                <hr style="border:0;border-top:1px dashed #000;margin:8px 0;">

                <div style="
                    text-align:center;
                    font-size:12px;
                    line-height:1.5;
                    margin:12px 0 8px;
                    padding:0 2px;
                    white-space:normal;
                    overflow-wrap:anywhere;
                    word-break:normal;
                ">
                    <strong>Obrigado pela preferência!</strong>
                    <br>
                    Volte sempre.
                </div>

            </div>
        `;


        // Envia a conta para impressão.
        await abrirImpressao(conteudo, configuracao);

        // Confere novamente o estado antes de registrar a impressão.
        const confirmacaoFinal = await getDoc(
            referenciaFechamento
        );

        if (!confirmacaoFinal.exists()) {
            console.warn(
                "O fechamento deixou de existir após a impressão:",
                fechamento.id
            );
            return;
        }

        if (confirmacaoFinal.data().status !== "novo") {
            console.warn(
                "O estado do fechamento mudou durante a impressão:",
                fechamento.id
            );
            return;
        }

        // Registra que a impressão foi enviada.
        // NÃO apaga pedidos, NÃO libera a mesa e NÃO exclui o fechamento.
        await setDoc(
            referenciaFechamento,
            {
                status: "impresso",
                impressoEm: serverTimestamp()
            },
            {
                merge: true
            }
        );

        console.log(
            "Conta enviada para impressão. Atendimento mantido em pagamento:",
            fechamento.id
        );

    } catch (erro) {

        console.error(
            "Erro ao imprimir fechamento:",
            erro
        );

    } finally {

        impressoesAutomaticasEmAndamento.delete(
            chaveTrava
        );

        liberarTravaImpressao(chaveTrava);

    }

}

// =====================================================
// ESCUTAR FECHAMENTOS
// =====================================================

onSnapshot(

    collection(
        db,
        "fechamentos"
    ),

    snapshot => {

        snapshot.docChanges()
            .forEach(
                alteracao => {

                    if (
                        alteracao.type !== "added"
                    ) {

                        return;

                    }


                    const fechamento = {

                        id:
                            alteracao.doc.id,

                        ...alteracao.doc.data()

                    };


                    if (
                        fechamento.status !== "novo"
                    ) {

                        return;

                    }


                    console.log(
                        "NOVO FECHAMENTO PARA IMPRESSÃO:",
                        fechamento
                    );


                    imprimirFechamentoAutomaticamente(
                        fechamento
                    );

                }
            );

    },

    erro => {

        console.error(
            "Erro ao observar fechamentos:",
            erro
        );

    }

);


console.log(
    "Módulo de impressão Hotel Garcom TESTE carregado."
);
