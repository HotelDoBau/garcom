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


// =====================================================
// IMPRESSÃO
// =====================================================

function abrirImpressao(
    conteudo,
    configuracao = CONFIGURACAO_IMPRESSAO_PADRAO
) {

    return new Promise(
        (resolve, reject) => {

            try {

                const iframe =
                    document.createElement("iframe");


                iframe.style.position = "fixed";
                iframe.style.width = "1px";
                iframe.style.height = "1px";
                iframe.style.border = "0";
                iframe.style.opacity = "0";
                iframe.style.pointerEvents = "none";


                document.body.appendChild(
                    iframe
                );


                const documento =
                    iframe.contentWindow.document;


                const larguraPapel =
                    Number(
                        configuracao.larguraPapel
                    ) === 80
                        ? 80
                        : 80;


                const larguraConteudo =
                    larguraPapel - 8;


                const numeroVias =
                    Math.max(
                        1,
                        Math.min(
                            2,
                            Number(
                                configuracao.numeroVias
                            ) || 1
                        )
                    );


                let conteudoFinal = "";


                for (
                    let via = 1;
                    via <= numeroVias;
                    via++
                ) {

                    conteudoFinal += `

                        <div class="via-impressao">

                            ${conteudo}

                        </div>

                    `;


                    if (
                        via < numeroVias
                    ) {

                        conteudoFinal += `

                            <div class="quebra-via"></div>

                        `;

                    }

                }


                documento.open();


                documento.write(`

                    <!DOCTYPE html>

                    <html>

                    <head>

                        <meta charset="UTF-8">

                        <style>

                            @page {

                                size:
                                    ${larguraPapel}mm auto;

                                margin: 3mm;

                            }


                            html,
                            body {

                                margin: 0;

                                padding: 0;

                                width:
                                    ${larguraConteudo}mm;

                                font-family:
                                    Arial,
                                    sans-serif;

                                font-size:
                                    12px;

                                color:
                                    #000;

                            }


                            body {

                                padding-bottom:
                                    10px;

                            }


                            .central {

                                text-align:
                                    center;

                            }


                            .separador {

                                border-top:
                                    1px dashed #000;

                                margin:
                                    8px 0;

                            }


                            .identificacao-print {

                                font-weight:
                                    bold;

                                font-size:
                                    14px;

                            }


                            .mesa-print {

                                font-weight:
                                    bold;

                                font-size:
                                    15px;

                                margin-top:
                                    4px;

                            }


                            .linha-item-impressao {

                                display:
                                    flex;

                                justify-content:
                                    space-between;

                                gap:
                                    8px;

                                margin:
                                    4px 0;

                            }


                            .item-producao {

                                font-size:
                                    13px;

                                margin:
                                    4px 0;

                            }


                            .obs {

                                margin-top:
                                    8px;

                                font-size:
                                    12px;

                            }


                            .total-impressao {

                                font-weight:
                                    bold;

                                font-size:
                                    15px;

                                margin-top:
                                    8px;

                            }


                            .quebra-via {

                                page-break-after:
                                    always;

                                break-after:
                                    page;

                                height:
                                    1px;

                            }


                            .via-impressao {

                                width:
                                    100%;

                            }

                        </style>

                    </head>

                    <body>

                        ${conteudoFinal}

                    </body>

                    </html>

                `);


                documento.close();


                setTimeout(
                    () => {

                        try {

                            iframe.contentWindow.focus();

                            iframe.contentWindow.print();

                        } catch (erro) {

                            console.error(
                                "Erro ao enviar impressão:",
                                erro
                            );

                            reject(erro);

                            return;

                        }


                        setTimeout(
                            () => {

                                iframe.remove();

                                resolve();

                            },
                            1200
                        );

                    },
                    700
                );


            } catch (erro) {

                reject(erro);

            }

        }
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
                    margin-bottom: 4px;
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

        <div class="central">

            <div class="identificacao-print">
                HOTEL DO BAÚ
            </div>

            <div>
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

                    <div class="item-producao">

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

        <div class="central">

            CONTA PARCIAL

            <br>

            MESA PERMANECE ABERTA

        </div>

    `;


    await abrirImpressao(
        conteudo,
        configuracao
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

        let conteudo = `
            <div style="text-align:center;font-family:Arial,sans-serif;">

                <strong style="font-size:18px;">
                    HOTEL DO BAÚ
                </strong>

                <br>

                <strong style="font-size:16px;">
                    CONTA FINAL
                </strong>

                <hr>
        `;

        // MESA / QUARTO
        if (configuracao.mostrarMesa) {
            conteudo += `
                <div style="text-align:left;">
                    <strong>
                        ${nomeLocal} ${numero}
                    </strong>
                    <br><br>
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
                <div style="text-align:center;margin-bottom:8px;">
                    Pedido #${escaparHTML(numeroComanda)}
                </div>
            `;
        }

        // GARÇOM
        if (configuracao.mostrarGarcom && fechamento.garcomNome) {
            conteudo += `
                <div style="text-align:center;font-weight:bold;margin-bottom:8px;">
                    GARÇOM: ${escaparHTML(fechamento.garcomNome)}
                </div>
            `;
        }

        // ITENS
        itens.forEach(item => {

            const quantidade = Number(item.quantidade || 0);
            const preco = Number(item.preco || 0);
            const subtotalItem = preco * quantidade;

            if (configuracao.mostrarPrecos) {
                conteudo += `
                    <div class="linha-item-impressao" style="margin-bottom:8px;">
                        <span>
                            ${quantidade}x ${escaparHTML(item.nome)}
                        </span>
                        <span>
                            R$ ${formatarValor(subtotalItem)}
                        </span>
                    </div>
                `;
            } else {
                conteudo += `
                    <div style="margin-bottom:8px;">
                        ${quantidade}x ${escaparHTML(item.nome)}
                    </div>
                `;
            }
        });

        // VALORES FINAIS
        const subtotal = Number(fechamento.subtotal || 0);
        const desconto = Number(fechamento.desconto || 0);
        const total = Number(fechamento.total || 0);

        if (configuracao.mostrarPrecos) {
            conteudo += `
                <hr>

                <div style="text-align:right;font-size:14px;">
                    Subtotal: R$ ${formatarValor(subtotal)}
                    <br>
                    Desconto: R$ ${formatarValor(desconto)}
                    <br><br>

                    <strong style="font-size:18px;">
                        TOTAL: R$ ${formatarValor(total)}
                    </strong>
                </div>
            `;
        }

        // HORÁRIO
        if (configuracao.mostrarHorario) {
            conteudo += `
                <br>
                <div style="text-align:center;font-size:12px;">
                    ${escaparHTML(fechamento.dataHora || "")}
                </div>
            `;
        }

        conteudo += `
                <br>
                <div style="text-align:center;font-size:12px;">
                    Obrigado pela preferência!
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
