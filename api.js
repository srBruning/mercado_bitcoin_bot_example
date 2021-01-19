require("dotenv-safe").config();
const crypto  = require('crypto');
const axios = require('axios');
const qs      = require('querystring')

//MERCADO BITCOIN
const unirest = require('unirest')
const ENDPOINT_API = 'https://www.mercadobitcoin.net/api/'


const ENDPOINT_TRADE_PATH = "/tapi/v3/"
const ENDPOINT_TRADE_API = 'https://www.mercadobitcoin.net' + ENDPOINT_TRADE_PATH


var MercadoBitcoin = function (config) {
    this.config = {
        CURRENCY: config.currency
    }
	this.exec = axios.create({
	  baseURL: ENDPOINT_API,
	  timeout: 5000,
	  headers: {'Accept': 'application/json'}
	});
}

MercadoBitcoin.prototype = {

    ticker: async function ( ) {
        return  await this.call('ticker');
    },

    orderBook: async function ( ) {
    	 return  await this.call('orderbook');
    },

    trades: async function ( ) {
    	 return  await this.call( 'trades');
    },

    call: async function (method) {
        const resp =  await this.exec.get(this.config.CURRENCY + '/' + method);
        return resp.data;
    },


}

var MercadoBitcoinTrade = function (config) {
    this.config = {
        KEY: config.key,
        SECRET: config.secret,
        PIN: config.pin,
        CURRENCY: config.currency
    }

    this.exec = axios.create({
	  baseURL: ENDPOINT_TRADE_API,
	  timeout: 5000,
	  headers: {'Accept': 'application/json', 'TAPI-ID': this.config.KEY}
	});
}

MercadoBitcoinTrade.prototype = {
    
    getAccountInfo:  async function( ) {
       return  this.call('get_account_info', {} )
    },

    listMyOrders:  async function (parameters) {
       return  this.call('list_orders', parameters)
    },

    placeBuyOrder:  async function(qty, limit_price){
       return  this.call('place_buy_order', {coin_pair: `BRL${this.config.CURRENCY}`, quantity: (''+qty).substr(0,10), limit_price: ''+limit_price})
    },

    placeSellOrder:  async function(qty, limit_price){
       return  this.call('place_sell_order', {coin_pair: `BRL${this.config.CURRENCY}`, quantity: (''+qty).substr(0,10), limit_price: ''+limit_price})
    },

    cancelOrder:  async function (orderId) {
       return  this.call('cancel_order', {coin_pair: `BRL${this.config.CURRENCY}`, order_id: orderId})
    },

	call: async  function (method, parameters) {

	   var now = Math.round(new Date().getTime() / 1000)
	   var queryString = qs.stringify({'tapi_method': method, 'tapi_nonce': now})
	   if(parameters) queryString += '&' + qs.stringify(parameters)

	   var signature = crypto.createHmac('sha512', this.config.SECRET)
	                         .update(ENDPOINT_TRADE_PATH + '?' + queryString)
	                         .digest('hex')
		 

		const response =  await this.exec.post('', queryString, {headers: {'Accept': 'application/json', 'TAPI-ID': this.config.KEY, 'TAPI-MAC': signature}});
		return response.data;
       
	}
}

module.exports = {
    MercadoBitcoin,
    MercadoBitcoinTrade
}