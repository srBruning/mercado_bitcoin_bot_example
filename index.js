//index.js
require("dotenv-safe").config();

const MercadoBitcoin = require("./api").MercadoBitcoin;
const MercadoBitcoinTrade = require("./api").MercadoBitcoinTrade;

const COIN_KYE = 'BCH';
var infoApi = new MercadoBitcoin({ currency: COIN_KYE })
var tradeApi = new MercadoBitcoinTrade({ 
    currency: COIN_KYE, 
    key: process.env.KEY, 
    secret: process.env.SECRET, 
    pin: process.env.PIN 
})

const precos =[];

const mediaDesvio = (lista) => {

	let media = lista.reduce((total, valor) => total+valor/lista.length, 0);
	let variancia = lista.reduce((total, valor) => total + Math.pow(media - valor, 2)/lista.length, 0);
	let desvioPadrao = Math.sqrt(variancia);
	let min = Math.min.apply(Math, lista)
	let max = Math.max.apply(Math, lista)
	let mediaPolos = (max+min)/2;
	let diffPolos = (max-min);
	let taxDesvioPadrao = ( ( (2*desvioPadrao)  * 100 )/ (media   - desvioPadrao) ) / 100;
	return {media, variancia, desvioPadrao, taxDesvioPadrao, min, max, mediaPolos, diffPolos}
}


let saldoBR = 100.00;
let saldoBTC= 0.00;

let btcZerado = !(saldoBTC>0);

const TAXA_TRADE = 0.004;
const TAXA_VAR_MIN = 0.0078;
const MIN_SALDO_BR = 30.00;

const comprar = async (vlr) => {

	const qtdBR = parseFloat( (saldoBR / 2).toFixed(5) );
	if(qtdBR < MIN_SALDO_BR) return ;

	const qtdCoin = parseFloat( ( ((1.0-TAXA_TRADE) * qtdBR )/ vlr).toFixed(5) - 0.00001 );

	if(qtdCoin < 0.00009) return ;
 	
	console.log("[* comprar] qtd: "+qtdCoin+"; vlr: "+vlr )
 	const data = await tradeApi.placeBuyOrder(qtdCoin, vlr);
	console.log( data);

}

const vender = async (vlr) => {
	 
	if(saldoBTC  <  0.001	) return ;

	const qtdCoin = parseFloat( ((1.0-TAXA_TRADE) * saldoBTC ).toFixed(5) );

	console.log("[* venda] qtd: "+qtdCoin+"; vlr: "+vlr )
	const data = await tradeApi.placeSellOrder(qtdCoin, vlr);
	console.log(data);

}

const negociar = async (dados) => {
	console.log(dados);
	let _vari = dados.desvioPadrao;
	if(dados.taxDesvioPadrao< TAXA_VAR_MIN){
		_vari = TAXA_VAR_MIN/2 * dados.media;
		console.log("Assumindo desvio: "+_vari);
	}
	
	const vlrCompra = parseFloat((dados.media - _vari).toFixed(5));
	const vlrVenda = parseFloat((dados.media + _vari).toFixed(5));

	await getQuantity(COIN_KYE, vlrCompra);
	comprar(vlrCompra);
	vender(vlrVenda);

	// saldoBTC += saldoBtcTmp;
	// saldoBR += saldoBrTmp;

	// saldoBtcTmp = 0.0;
	// saldoBrTmp = 0.0;

	// console.log("[* ]",  {saldoBR, saldoBTC} )
	// btcZerado =false;
}


async function getQuantity(coin, price){
    price = parseFloat(price)

    let response_data = await tradeApi.getAccountInfo();
    if(response_data.response_data){
    	response_data = response_data.response_data;
    }

    if(!response_data.balance){
    	console.log(response_data);
    	return;
    }

	console.log(response_data.balance['brl']);
	console.log(response_data.balance[coin.toLowerCase()]);


    saldoBR = parseFloat(response_data.balance['brl'].available).toFixed(5)
    saldoBTC = parseFloat(response_data.balance[coin.toLowerCase()].available).toFixed(5)

    console.log(`Saldo disponível de ${coin}: ${saldoBTC}`)
    console.log(`Saldo disponível de brl: ${saldoBR}`)
    
    // balanceBrl = parseFloat((balanceBrl / price).toFixed(5))
    // console.log(parseFloat(balanceBrl) - 0.00001)//tira a diferença que se ganha no arredondamento
}


setInterval(async () => {
   		const tick = await infoApi.ticker();

		console.log(tick)
		precos.push(tick.ticker.last);
		if(precos.length > 10000){
			precos.shift();
		}
		console.log(precos);
		if(precos.length > 1)
			negociar( mediaDesvio(precos) );
   		
   	},
   process.env.CRAWLER_INTERVAL
)

 