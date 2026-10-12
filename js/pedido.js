import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
db,
collection,
addDoc,
doc,
setDoc,
serverTimestamp,
getDocs
} from "./firebase.js";

let carrinho = [];

let produtosDisponiveis = [];

const listaProdutos =
document.getElementById(
"listaProdutos"
);

const buscar =
document.getElementById(
"buscar"
);

const qtdItens =
document.getElementById(
"qtdItens"
);

const totalPedido =
document.getElementById(
"totalPedido"
);

const numeroMesa =
localStorage.getItem(
"mesaSelecionada"
);

const tipoSelecionado =
localStorage.getItem(
"tipoSelecionado"
) || "mesa";

const ehQuarto =
tipoSelecionado === "quarto";

const nomeLocal =
ehQuarto
? "Quarto"
: "Mesa";

const prefixoLocal =
ehQuarto
? "quarto_"
: "mesa_";

const auth = getAuth();

console.log(
    "USUÁRIO AUTENTICADO:",
    auth.currentUser
);

// ===========================
// VERIFICA MESA
// ===========================

if (!numeroMesa) {


window.location.href =
    "index.html";


}

// ===========================
// TÍTULO
// ===========================

document.getElementById(
"tituloMesa"
).textContent =


nomeLocal +
" " +
String(
    numeroMesa
).padStart(
    2,
    "0"
);


// ===========================
// IMAGENS
// ===========================

function obterImagem(
produto
) {


if (produto.foto) {

    return produto.foto;

}


if (produto.imagem) {

    return produto.imagem;

}


const nome =
    String(
        produto.nome || ""
    ).toLowerCase();


if (
    produto.categoria ===
    "Cafeteria"
) {

    if (

        nome.includes(
            "cappuccino"
        ) ||

        nome.includes(
            "frapp"
        ) ||

        nome.includes(
            "affogato"
        ) ||

        nome.includes(
            "mochac"
        )

    ) {

        return (
            "img/cappuccino-espresso.webp"
        );

    }


    return (
        "img/cafe-espresso.webp"
    );

}


if (
    produto.categoria ===
    "Salgados"
) {

    return (
        "img/salgados.webp"
    );

}


if (
    produto.categoria ===
    "Lanches"
) {

    return (
        "img/lanche.webp"
    );

}


if (
    produto.categoria ===
    "Pratos Feitos"
) {

    return (
        "img/pf.webp"
    );

}


if (
    produto.categoria ===
    "Bebidas"
) {

    return (
        "img/bebidas.webp"
    );

}


if (
    produto.categoria ===
    "Cervejas e Vinhos"
) {

    return (
        "img/bebidas.webp"
    );

}


if (
    produto.categoria ===
    "Adicionais"
) {

    return (
        "img/adicionais.webp"
    );

}


if (
    produto.categoria ===
    "Doces"
) {

    return (
        "img/doces.webp"
    );

}


if (
    produto.categoria ===
    "Petiscos"
) {

    return (
        "img/petiscos.webp"
    );

}


if (
    produto.categoria ===
    "Drinks"
) {

    return (
        "img/drinks.webp"
    );

}


return "";


}

// ===========================
// CARREGAR PRODUTOS
// ===========================

async function carregarProdutosFirebase() {


try {

    const referencia =
        collection(
            db,
            "produtos"
        );


    const resultado =
        await getDocs(
            referencia
        );


    produtosDisponiveis = [];


    resultado.forEach(
        documento => {

            const dados =
                documento.data();


            produtosDisponiveis.push({

                id:
                    documento.id,

                nome:
                    dados.nome || "",

                categoria:
                    dados.categoria ||
                    "Outros",

                descricao:
                    dados.descricao || "",

                preco:
                    Number(
                        dados.preco || 0
                    ),

                foto:
                    dados.foto || ""

            });

        }
    );


    // ===========================
    // ORDENA
    // ===========================

    produtosDisponiveis.sort(
        (
            a,
            b
        ) => {

            const categoriaA =
                String(
                    a.categoria || ""
                ).toLowerCase();


            const categoriaB =
                String(
                    b.categoria || ""
                ).toLowerCase();


            if (
                categoriaA <
                categoriaB
            ) {

                return -1;

            }


            if (
                categoriaA >
                categoriaB
            ) {

                return 1;

            }


            return String(
                a.nome || ""
            ).localeCompare(
                String(
                    b.nome || ""
                ),
                "pt-BR"
            );

        }
    );


    console.log(
        "Produtos carregados do Firestore:",
        produtosDisponiveis
    );


    renderizarProdutos();


} catch (erro) {

    console.error(
        "Erro ao carregar produtos:",
        erro
    );


    listaProdutos.innerHTML = `

        <div
            style="
                padding: 20px;
                text-align: center;
            "
        >

            Erro ao carregar os produtos.

        </div>

    `;

}


}

// ===========================
// RENDERIZAR PRODUTOS
// ===========================

function renderizarProdutos(
filtro = ""
) {


listaProdutos.innerHTML = "";


const categorias = [

    ...new Set(

        produtosDisponiveis.map(
            produto =>
                produto.categoria
        )

    )

];



const iconesCategoria = {

    "Cafeteria": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/>
            <path d="M17 10h2a2 2 0 0 1 0 4h-2"/>
            <path d="M8 5c-1-1 1-2 0-3"/>
            <path d="M12 5c-1-1 1-2 0-3"/>
        </svg>
    `,

    "Salgados": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 16 7 7a3 3 0 0 1 5-1l9 10a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3Z"/>
            <path d="m8 9 2 2m2-5 2 3m1 2 2 2"/>
        </svg>
    `,

    "Lanches": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 10a8 8 0 0 1 16 0H4Z"/>
            <path d="M4 13h16l-2 4H6l-2-4Z"/>
            <path d="M5 19h14"/>
            <path d="m8 8 .1.1m4-2 .1.1m4 2 .1.1"/>
        </svg>
    `,

    "Pratos Feitos": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5.5"/>
            <path d="M3 4v5m2-5v5M4 9v11M21 4v16"/>
        </svg>
    `,

    "Bebidas": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3h10l-1 18H8L7 3Z"/>
            <path d="M7.5 8h9"/>
            <path d="M10 12h4"/>
        </svg>
    `,

    "Cervejas e Vinhos": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z"/>
            <path d="M12 12v8m-4 1h8"/>
            <path d="M8 6h8"/>
        </svg>
    `,

    "Adicionais": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v10M7 12h10"/>
        </svg>
    `,

    "Doces": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 14h16l-2 6H6l-2-6Z"/>
            <path d="M4 14a4 4 0 0 1 4-4 4 4 0 0 1 8 0 4 4 0 0 1 4 4"/>
            <path d="M12 5v2"/>
        </svg>
    `,

    "Petiscos": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16l-2 15H6L4 5Z"/>
            <path d="M8 9v7m4-7v7m4-7v7"/>
            <path d="M3 5h18"/>
        </svg>
    `,

    "Drinks": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h16l-7 9v6h-2v-6L4 4Z"/>
            <path d="M8 8h8"/>
            <path d="M9 22h6"/>
            <path d="m16 2 3 3"/>
        </svg>
    `,

    "Outros": `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 11v5m0-8h.01"/>
        </svg>
    `

};



categorias.forEach(
    categoria => {

        const itens =
            produtosDisponiveis.filter(
                produto =>

                    produto.categoria ===
                    categoria &&

                    String(
                        produto.nome || ""
                    )
                        .toLowerCase()
                        .includes(
                            filtro.toLowerCase()
                        )
            );


        if (
            itens.length === 0
        ) {

            return;

        }


        const grupo =
            document.createElement(
                "section"
            );


        grupo.className =
            "grupo-categoria";


        const titulo =
            document.createElement(
                "button"
            );


        titulo.type =
            "button";


        titulo.className =
            "categoria-produto";


      
titulo.innerHTML = `

    <span class="categoria-identidade">

        <span class="icone-categoria">
            ${
                iconesCategoria[categoria] ||
                iconesCategoria["Outros"]
            }
        </span>

        <span class="nome-categoria">
            ${categoria}
        </span>

    </span>

    <span class="seta-categoria">
        ▼
    </span>

`;



        const conteudo =
            document.createElement(
                "div"
            );


        conteudo.className =
            "conteudo-categoria";


        itens.forEach(
            produto => {

                const itemCarrinho =
                    carrinho.find(
                        item =>
                            String(
                                item.id
                            ) ===
                            String(
                                produto.id
                            )
                    );


                const quantidade =
                    itemCarrinho
                        ? itemCarrinho.quantidade
                        : 0;


                const imagem =
                    obterImagem(
                        produto
                    );


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "produto-card";


                let imagemHTML =
                    "";


                if (imagem) {

                    imagemHTML = `

                        <img
                            src="${imagem}"
                            alt="${produto.nome}"
                            class="foto-produto"
                        >

                    `;

                }


                card.innerHTML = `

                    ${imagemHTML}

                    <div class="produto-info">

                        <h3>
                            ${produto.nome}
                        </h3>

                        <p>
                            R$
                            ${Number(
                                produto.preco
                            ).toFixed(2)}
                        </p>

                    </div>

                    <div
                        class="controle-produto"
                    >

                        <button
                            type="button"
                            onclick="
                                alterarQuantidade(
                                    '${String(
                                        produto.id
                                    ).replace(
                                        /'/g,
                                        "\\'"
                                    )}',
                                    -1
                                )
                            "
                        >
                            −
                        </button>

                        <strong>
                            ${quantidade}
                        </strong>

                        <button
                            type="button"
                            onclick="
                                alterarQuantidade(
                                    '${String(
                                        produto.id
                                    ).replace(
                                        /'/g,
                                        "\\'"
                                    )}',
                                    1
                                )
                            "
                        >
                            +
                        </button>

                    </div>

                `;


                conteudo.appendChild(
                    card
                );

            }
        );


        titulo.addEventListener(
            "click",
            function () {

                const aberta =
                    conteudo.classList.toggle(
                        "aberta"
                    );


                titulo.classList.toggle(
                    "ativo",
                    aberta
                );

            }
        );


        grupo.appendChild(
            titulo
        );


        grupo.appendChild(
            conteudo
        );


        listaProdutos.appendChild(
            grupo
        );

    }
);


}

// ===========================
// ALTERAR QUANTIDADE
// ===========================

function alterarQuantidade(
id,
valor
) {


const produto =
    produtosDisponiveis.find(
        produto =>
            String(
                produto.id
            ) ===
            String(id)
    );


if (!produto) {

    return;

}


let item =
    carrinho.find(
        item =>
            String(
                item.id
            ) ===
            String(id)
    );


if (
    !item &&
    valor > 0
) {

    item = {

        ...produto,

        quantidade: 0

    };


    carrinho.push(
        item
    );

}


if (!item) {

    return;

}


item.quantidade +=
    valor;


if (
    item.quantidade <= 0
) {

    carrinho =
        carrinho.filter(
            item =>
                String(
                    item.id
                ) !==
                String(id)
        );

}


atualizarResumo();


renderizarProdutos(
    buscar.value
);


}

// ===========================
// ATUALIZAR RESUMO
// ===========================

function atualizarResumo() {


let quantidade = 0;

let total = 0;


carrinho.forEach(
    item => {

        quantidade +=
            Number(
                item.quantidade
            );


        total +=

            Number(
                item.preco
            ) *

            Number(
                item.quantidade
            );

    }
);


qtdItens.textContent =
    quantidade;


totalPedido.textContent =
    "R$ " +
    total.toFixed(2);


}

// ===========================
// REVISÃO
// ===========================

function abrirRevisao() {


if (
    carrinho.length === 0
) {

    alert(
        "Adicione algum item ao pedido."
    );

    return;

}


const modal =
    document.getElementById(
        "modalRevisao"
    );


const lista =
    document.getElementById(
        "listaRevisao"
    );


lista.innerHTML = "";


carrinho.forEach(
    item => {

        const subtotal =

            Number(
                item.preco
            ) *

            Number(
                item.quantidade
            );


        const div =
            document.createElement(
                "div"
            );


        div.className =
            "item-revisao";


        div.innerHTML = `

            <div
                class="info-revisao"
            >

                <strong>
                    ${item.nome}
                </strong>

                <small>
                    R$
                    ${Number(
                        item.preco
                    ).toFixed(2)}
                </small>

            </div>


            <div
                class="controle-revisao"
            >

                <button
                    type="button"
                    onclick="
                        alterarQuantidadeRevisao(
                            '${String(
                                item.id
                            ).replace(
                                /'/g,
                                "\\'"
                            )}',
                            -1
                        )
                    "
                >
                    −
                </button>


                <strong>
                    ${item.quantidade}
                </strong>


                <button
                    type="button"
                    onclick="
                        alterarQuantidadeRevisao(
                            '${String(
                                item.id
                            ).replace(
                                /'/g,
                                "\\'"
                            )}',
                            1
                        )
                    "
                >
                    +
                </button>

            </div>


            <strong>
                R$
                ${subtotal.toFixed(2)}
            </strong>

        `;


        lista.appendChild(
            div
        );

    }
);


atualizarTotalRevisao();


modal.classList.add(
    "mostrar"
);


}

// ===========================
// ALTERAR QUANTIDADE NA REVISÃO
// ===========================

function alterarQuantidadeRevisao(
id,
valor
) {


alterarQuantidade(
    id,
    valor
);


if (
    carrinho.length === 0
) {

    fecharRevisao();

    return;

}


abrirRevisao();


}

// ===========================
// TOTAL DA REVISÃO
// ===========================

function atualizarTotalRevisao() {


const total =
    carrinho.reduce(

        (
            soma,
            item
        ) =>

            soma +

            Number(
                item.preco
            ) *

            Number(
                item.quantidade
            ),

        0

    );


document.getElementById(
    "totalRevisao"
).textContent =

    "R$ " +
    total.toFixed(2);


}

// ===========================
// FECHAR REVISÃO
// ===========================

function fecharRevisao() {


document.getElementById(
    "modalRevisao"
).classList.remove(
    "mostrar"
);


}

// ===========================
// ENVIAR PEDIDO
// ===========================

async function enviarPedido() {


if (
    carrinho.length === 0
) {

    alert(
        "Adicione algum item ao pedido."
    );

    return;

}


const observacaoCampo =
    document.getElementById(
        "observacao"
    );


const observacao =
    observacaoCampo.value.trim() ||
    "Nenhuma";


const quartoCampo =
    document.getElementById(
        "numeroQuarto"
    );


const quarto =
    quartoCampo
        ? quartoCampo.value.trim()
        : "";


// ===========================
// GARÇOM LOGADO
// ===========================

let garcomNome =
    "Não informado";


let garcomUid =
    "";


try {

    // Chave atual do sistema
    let usuarioSalvo =
        localStorage.getItem(
            "usuarioLogado"
        );


    // Compatibilidade com chave antiga
    if (!usuarioSalvo) {

        usuarioSalvo =
            localStorage.getItem(
                "garcomLogado"
            );

    }


    if (usuarioSalvo) {

        const usuario =
            JSON.parse(
                usuarioSalvo
            );


        garcomNome =
            usuario.nome ||
            usuario.nomeGarcom ||
            usuario.usuario ||
            "Não informado";


        garcomUid =
            usuario.uid ||
            "";

    }


} catch (erro) {

    console.error(
        "Erro ao identificar garçom:",
        erro
    );

}


try {

    const numeroPedido =
        Date.now();


    const itensPedido =
        carrinho.map(
            item => ({

                id:
                    item.id,

                nome:
                    item.nome,

                preco:
                    Number(
                        item.preco
                    ),

                quantidade:
                    Number(
                        item.quantidade
                    ),

                subtotal:

                    Number(
                        item.preco
                    ) *

                    Number(
                        item.quantidade
                    )

            })
        );


    const totalPedidoValor =
        itensPedido.reduce(

            (
                soma,
                item
            ) =>

                soma +
                item.subtotal,

            0

        );


    const referenciaMesa =
        doc(

            db,

            "mesas",

            prefixoLocal +

            String(
                numeroMesa
            ).padStart(
                2,
                "0"
            )

        );


    // ===========================
    // VERIFICA SE JÁ EXISTEM
    // PEDIDOS NESTE LOCAL
    // ===========================

    let quantidadePedidosAntes =
        0;


    try {

        const pedidosExistentes =
            await getDocs(

                collection(
                    referenciaMesa,
                    "pedidos"
                )

            );


        quantidadePedidosAntes =
            pedidosExistentes.size;


    } catch (erro) {

        console.error(
            "Não foi possível verificar pedidos anteriores:",
            erro
        );

    }


    // ===========================
    // ATUALIZA A MESA
    // ===========================

    await setDoc(

        referenciaMesa,

        {

            numero:
                Number(
                    numeroMesa
                ),

            tipo:
                tipoSelecionado,

            status:
                "ocupada",

            atualizadoEm:
                serverTimestamp()

        },

        {

            merge:
                true

        }

    );


    // ===========================
    // SALVA PEDIDO NA MESA
    // ===========================

    await addDoc(

        collection(

            referenciaMesa,

            "pedidos"

        ),

        {

            numeroPedido:
                numeroPedido,

            tipo:
                tipoSelecionado,

            mesa:
                ehQuarto
                    ? null
                    : Number(
                        numeroMesa
                    ),

            quarto:
                ehQuarto
                    ? Number(
                        numeroMesa
                    )
                    : quarto,

            itens:
                itensPedido,

            observacao:
                observacao,

            total:
                totalPedidoValor,

            criadoEm:
                serverTimestamp(),

            dataHora:
                new Date()
                    .toLocaleString(
                        "pt-BR"
                    )

        }

    );


    // ===========================
    // ENVIA PARA PRODUÇÃO
    // ===========================

    await addDoc(

        collection(
            db,
            "pedidos_producao"
        ),

        {

            numeroPedido:
                numeroPedido,

            // ===========================
            // GARÇOM
            // ===========================

            garcomNome:
                garcomNome,

            mesa:
                ehQuarto
                    ? null
                    : Number(
                        numeroMesa
                    ),

            quarto:
                ehQuarto
                    ? Number(
                        numeroMesa
                    )
                    : quarto,

            tipo:
                tipoSelecionado,

            numero:
                Number(
                    numeroMesa
                ),

            itens:
                itensPedido,

            observacao:
                observacao,

            total:
                totalPedidoValor,

            status:
                "novo",

            criadoEm:
                serverTimestamp(),

            dataHora:
                new Date()
                    .toLocaleString(
                        "pt-BR"
                    )

        }

    );


   // ===========================
// AUDITORIA
// ===========================

console.log(
    "CHEGOU ANTES DA AUDITORIA"
);

console.log(
    "VERIFICAÇÃO AUDITORIA:",
    quantidadePedidosAntes
);


// ===========================
// PRIMEIRO PEDIDO DO LOCAL
// ===========================

if (
    quantidadePedidosAntes === 0
) {

    try {

        await addDoc(

            collection(
                db,
                "auditoria_pedidos"
            ),

            {

                acao:
                    "Abriu " +
                    nomeLocal.toLowerCase(),

                descricao:
                    "Abriu " +
                    nomeLocal.toLowerCase() +
                    " " +
                    String(
                        numeroMesa
                    ).padStart(
                        2,
                        "0"
                    ) +
                    " com o primeiro pedido.",

                garcomNome:
                    garcomNome,

                garcomUid:
                    garcomUid,

                usuarioTipo:
                    "garcom",

                local:
                    nomeLocal +
                    " " +
                    String(
                        numeroMesa
                    ).padStart(
                        2,
                        "0"
                    ),

                tipoLocal:
                    tipoSelecionado,

                numeroLocal:
                    Number(
                        numeroMesa
                    ),

                comanda:
                    "",

                itemNome:
                    itensPedido
                        .map(
                            item =>
                                item.nome
                        )
                        .join(
                            ", "
                        ),

                quantidade:
                    itensPedido
                        .reduce(
                            (
                                soma,
                                item
                            ) =>
                                soma +
                                Number(
                                    item.quantidade ||
                                    0
                                ),
                            0
                        ),

                observacao:
                    observacao,

                numeroPedido:
                    numeroPedido,

                criadoEm:
                    serverTimestamp()

            }

        );

        console.log(
            "Auditoria registrada: abertura do local."
        );

    } catch (erroAuditoria) {

        console.error(
            "Erro ao registrar auditoria:",
            erroAuditoria
        );

    }

}


// ===========================
// PEDIDO ADICIONAL
// LOCAL JÁ ESTAVA ABERTO
// ===========================

if (
    quantidadePedidosAntes > 0
) {

    try {

        const quantidadeTotal =
            itensPedido.reduce(
                (soma, item) =>
                    soma +
                    Number(item.quantidade || 0),
                0
            );

        const nomesItens =
            itensPedido
                .map(
                    item =>
                        Number(item.quantidade || 0) > 1
                            ? Number(item.quantidade) +
                              "x " +
                              item.nome
                            : item.nome
                )
                .join(", ");

        await addDoc(
            collection(
                db,
                "auditoria_pedidos"
            ),
            {
                acao: "Acrescentou itens",

                descricao:
                    "Acrescentou " +
                    nomesItens +
                    " na " +
                    nomeLocal.toLowerCase() +
                    " " +
                    String(numeroMesa).padStart(2, "0") +
                    ".",

                garcomNome: garcomNome,
                garcomUid: garcomUid,
                usuarioTipo: "garcom",

                local:
                    nomeLocal +
                    " " +
                    String(numeroMesa).padStart(2, "0"),

                tipoLocal: tipoSelecionado,
                numeroLocal: Number(numeroMesa),
                comanda: "",
                itemNome: nomesItens,
                quantidade: quantidadeTotal,
                observacao: observacao,
                numeroPedido: numeroPedido,
                criadoEm: serverTimestamp()
            }
        );

        console.log(
            "Auditoria registrada: itens acrescentados."
        );

    } catch (erroAuditoria) {

        console.error(
            "Erro ao registrar auditoria:",
            erroAuditoria
        );

    }

}

// ===========================
// FINALIZA O ENVIO DO PEDIDO
// ===========================

fecharRevisao();

window.location.href = "index.html";

    
// ===========================
// FECHA O TRY PRINCIPAL
// ===========================

} catch (erroEnvio) {

    console.error(
        "Erro ao enviar pedido:",
        erroEnvio
    );

    alert(
        "Não foi possível enviar o pedido. Verifique a conexão e tente novamente."
    );

}

    }
// ===========================
// PESQUISA
// ===========================



buscar.addEventListener(
"input",
function () {


    renderizarProdutos(
        buscar.value
    );

}


);

// ===========================
// DISPONIBILIZA FUNÇÕES
// ===========================

window.abrirRevisao =
abrirRevisao;

window.fecharRevisao =
fecharRevisao;

window.enviarPedido =
enviarPedido;

window.alterarQuantidade =
alterarQuantidade;

window.alterarQuantidadeRevisao =
alterarQuantidadeRevisao;

// ===========================
// INICIAR
// ===========================

async function iniciar() {


atualizarResumo();


await carregarProdutosFirebase();


}

iniciar();
