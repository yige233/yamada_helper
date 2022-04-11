import Main from "./main.js"

const Buy = new Main({ //初始化购买程序
    access_token: "", //身份凭据，可以通过fiddler抓包山田yamada小程序，请求headers里“x-accss-token”的值即是身份凭据
    purchase_gap: 1000, //两次购买行为之间的间隔，单位：毫秒。    ！注意：单次购买行为的耗时和该参数无关！
    purchase_loop: true //是否在购买失败时自动重新购买
});
const item = { //初始化商品对象
    goodsUuid: "20220310115617390", //商品代码，可通过用fiddler抓包山田yamada小程序，请求体里通常就能找到，一般是“goodsUuid=xxxxxxxxx”的形式，xxxxxxxxx即是商品代码
    standardsValue: [47733, 47734], //商品规格代码，是一个数组，程序运行时会打印出该商品所有的规格组合以及相应代码
    quantity: 1, //购买数量
    postType: 1, //邮寄方式 包邮=1，不包邮=2。一般6000日元以上才能包邮
    currentPos: [26.15021, 119.13139] //定位经纬度，提交订单时需要用到
};
Buy.Buy(item) //开始购买，传入商品对象。购买成功后进入小程序里找到未付款的订单，付款即可
//Buy.showLog() //此方法会显示最后一次购买行为的时间和所有请求返回的数据