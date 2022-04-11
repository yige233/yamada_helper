import fetch from "node-fetch";
import nedb from "nedb";

class Main {
    constructor(config) {
        Main.log("[信息][初始化]正在使用用于山田yamada小程序的自动抢购程序！")
        this.db = new nedb({
            filename: './data.db',
            autoload: true
        });
        if (!config.access_token) {
            Main.log("[\x1B[31m错误\x1B[0m][身份认证]需要提供登录凭据！");
            throw new Error("需要提供登录凭据！")
        };
        this.access_token = config.access_token;
        this.purchase_gap = config.purchase_gap || 1000;
        this.purchase_loop = config.purchase_loop || false;
    };
    async logdb(key, data) {
        let test = await new Promise((resolve) => this.db.find({
            key: key,
        }, function (err, docs) {
            if (err || !docs.length) return resolve(false)
            if (docs.length) return resolve(true)
        }));
        if (test) this.db.update({
            key: key,
        }, {
            $set: {
                data: data,
            },
        }, () => {});
        if (!test) this.db.insert({
            key: key,
            data: data
        }, () => {})
    };
    static log(log) {
        console.log(`[${new Date().toLocaleString("chinese", {
            hour12: false
        })}]`, log)
    };
    async showLog() {
        this.db.find({}, {
            _id: 0
        }, (err, res) => {
            for (let i of res) console.log(i)
        });
    };
    async mainBuy(item, hide_goods_info) {
        return new Promise(async (resolve, reject) => {
            //准备记录本次运行情况
            for (let i of ["step0", "step1", "step2", "step3", "step4"]) await this.logdb(i, {});
            //获取商品信息
            let response0 = await fetch("https://xcx.rrts.cn/goods/getGoodsInfo", {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "x-access-token": this.access_token
                },
                body: `goodsUuid=${item.goodsUuid}`,
                method: "post"
            });
            if (!response0.ok) return reject("[\x1B[31m\x1B[31m错误\x1B[0m\x1B[0m][获取商品信息]网络错误：" + response0.status + response0.statusText);
            let res_json0 = await response0.json();
            await this.logdb("step0", res_json0);
            if (res_json0.msg) return reject("[\x1B[31m错误\x1B[0m][获取商品信息]" + res_json0.msg);
            let standards = [];
            let shopId = res_json0.data.shopId;
            if (!hide_goods_info) Main.log(`[信息][商品信息]商品名：${res_json0.data.goodsName}，可选规格有：`);
            for (let goods of res_json0.data.goodsSkuVos) {
                let code = [];
                let desc = "";
                for (let property of goods.productSkuStandardPo.standardNameSinglePoList) {
                    desc += `${property.name}：${property.standardValuePo.name}；`;
                    code.push(property.standardValuePo.sign);
                };
                standards.push(code);
                if (!hide_goods_info) Main.log(`[信息][商品信息] ${desc} 代码：[${code.join()}]`);
            };
            //判断商品规格是否可用
            let mark = false;
            for (let standard of standards) {
                if (item.standardsValue.join() == standard.join()) {
                    mark = true;
                    break;
                };
            };
            if (!item.standardsValue.length) reject("[\x1B[31m错误\x1B[0m][选择商品规格]没有选择规格！");
            if (!mark) reject(`[\x1B[31m错误\x1B[0m][选择商品规格]所选规格: [${item.standardsValue.join()}] 与可选规格不符！`);
            if (!hide_goods_info) Main.log(`[信息][选择商品规格]所选规格: [${item.standardsValue.join()}]`)
            //选取商品
            let response1 = await fetch("https://xcx.rrts.cn/ShoppingCart/searchStockAndProductSkuUuid", {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "x-access-token": this.access_token
                },
                body: `goodsUuid=${item.goodsUuid}&standardsValue=${encodeURIComponent(item.standardsValue.join())}`,
                method: "post"
            });
            if (!response1.ok) return reject("[\x1B[31m错误\x1B[0m][选取商品]网络错误：" + response1.status + response1.statusText);
            let res_json1 = await response1.json();
            await this.logdb("step1", res_json1);
            if (res_json1.msg) return reject("[\x1B[31m错误\x1B[0m][选取商品]" + res_json1.msg);
            //填写订单
            let response2 = await fetch("https://xcx.rrts.cn/ShoppingCart/saveNowChecked", {
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "x-access-token": this.access_token
                },
                body: `quantity=${item.quantity}&goodsSkuUuid=${res_json1.data.goodsSkuUuid}&goodsUuid=${item.goodsUuid}`,
                method: "post"
            });
            if (!response2.ok) return reject("[\x1B[31m错误\x1B[0m][填写订单]网络错误：" + response2.status + response1.statusText);
            let res_json2 = await response2.json();
            await this.logdb("step2", res_json2);
            if (res_json2.msg) return reject("[\x1B[31m错误\x1B[0m][填写订单]" + res_json2.msg);
            //确认订单
            let response3 = await fetch("https://xcx.rrts.cn/ShoppingCart/buyNowAccounts", {
                headers: {
                    "content-type": "application/json",
                    "x-access-token": this.access_token
                },
                method: "post",
                body: JSON.stringify({
                    latitude: item.currentPos[0],
                    longitude: item.currentPos[1],
                    shopId: shopId,
                    type: 0,
                    bindId: "",
                    redPacketId: "",
                    postType: item.postType
                })
            });
            if (!response3.ok) return reject("[\x1B[31m错误\x1B[0m][确认订单]网络错误：" + response3.status + response1.statusText);
            let res_json3 = await response3.json();
            await this.logdb("step3", res_json3);
            if (res_json3.msg) return reject("[\x1B[31m错误\x1B[0m][确认订单]" + res_json3.msg);
            Main.log(`[信息][确认订单]购买人：${res_json3.data.registerVo.name}，商品：${res_json3.data.goodsList[0].goodsName}`);
            //提交订单
            let response4 = await fetch("https://xcx.rrts.cn/ShoppingCart/createNowOrder", {
                headers: {
                    "content-type": "application/json",
                    "x-access-token": this.access_token
                },
                method: "post",
                body: JSON.stringify({
                    bindId: "",
                    buyerMessage: "",
                    claimTime: "",
                    redPacketId: "",
                    shopId: shopId,
                    type: 0,
                    userAddressId: res_json3.data.address.id,
                    postType: item.postType
                })
            });
            if (!response4.ok) return reject("[\x1B[31m错误\x1B[0m][提交订单]网络错误：" + response4.status + response1.statusText);
            let res_json4 = await response4.json();
            await this.logdb("step4", res_json4);
            if (res_json4.msg) return reject("[\x1B[31m错误\x1B[0m][提交订单]" + res_json4.msg);
            resolve("[信息][提交订单]订单已创建，现在可以打开山田yamada小程序付款。");
        });
    };
    async Buy(item) {
        let hide_goods_info = false;
        while (true) {
            await this.logdb("time", new Date().toLocaleString("chinese", {
                hour12: false
            }));
            try {
                let buy = await this.mainBuy(item, hide_goods_info);
                Main.log(buy);
                break;
            } catch (err) {
                Main.log(err);
                hide_goods_info = true;
                if (!this.purchase_loop) break;
            };
            await new Promise(resolve => setTimeout(resolve, this.purchase_gap));
        };
    };
};
export default Main