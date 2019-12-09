var express = require('express');
var router = express.Router();
const utils = require('../../module/utils/utils');
const resMessage = require('../../module/utils/responseMessage');
const statusCode = require('../../module/utils/statusCode');
const db = require('../../module/pool');
const authUtils = require('../../module/utils/authUtils');

// 거래 요청받은 상품 조회
// 대기:0 수락:1
router.get('/', authUtils.isLoggedin, async(req, res) => {
	const user_idx = req.decoded.idx;//'나'의 idx

	//교환요청을 받은 모든 물품을 가져온다
	const getAllTradeQuery = "SELECT DISTINCT to_item_idx FROM trade ORDER BY date ASC"; //중복제거
	const getAllTradeResult = await db.queryParam_Parse(getAllTradeQuery);
	
	//아무값도 없다면 값이 비었다는 메세지를 보낸다.
	if(!getAllTradeResult){
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.NULL_VALUE));
		return;
	}

	//item 테이블에서 교환요청을 받은 물품이면서 그 물품의 작성자가 user_idx인 물품의 item_idx를 뽑아서 myItem배열에 저장한다.
	let myItem = [];
	for(let i = 0; i < getAllTradeResult.length; i++){
		const getMyItemQuery = "SELECT item_idx FROM item WHERE item_idx = ? AND writer_idx = ?";
		const getMyItemResult = await db.queryParam_Parse(getMyItemQuery,[getAllTradeResult[i].to_item_idx,user_idx]);
		
		if(!getMyItemResult[0]){
			continue;
		}
		myItem.push(getMyItemResult[0]);
	}

	//내 물품이 요청받은 물품인 trade_idx와 해당 거래의 모든 정보를 myTrade에 저장한다.
	let myTrade = [];
	for(let i = 0; i < myItem.length; i++){
		
		const getMyTradeQuery = "SELECT * FROM trade WHERE to_item_idx = ? AND state = 0 ORDER BY date ASC";
		const getMyTradeResult = await db.queryParam_Parse(getMyTradeQuery,[myItem[i].item_idx]);
		
		if(!getMyTradeResult[0]){
			continue;
		}
		
		//거래를 요청 받은 나의 물품이 여러 물품에게 거래요청을 받았을 경우를 생각한다.
		//예) 4 ->5   3->5  요청이면 위 쿼리문에서는 4,3의 거래 내용을 가지고 있기 때문에 그 길이만큼 for문을 돌려 저장한다.
		for(let k = 0; k < getMyTradeResult.length; k++){
			myTrade.push(getMyTradeResult[k]);
		}
		
	}
	
	let result = [];//최종결과물
	//내 거래내역에서 필요한 정보들을 가져온다
	for(let i = 0; i < myTrade.length; i++){
		let buf = {};
		//거래 요청 한 상대의 물품 정보 (하나 가져오는거)
		const getAskItemQuery = "SELECT title, thumbnail, writer_idx FROM item WHERE item_idx = ?";
		const getAskItemResult = await db.queryParam_Parse(getAskItemQuery,[myTrade[i].from_item_idx]);
		
		buf.ask_item_idx = myTrade[i].from_item_idx;
		buf.ask_item_title = getAskItemResult[0].title;
		buf.ask_item_thumbnail = getAskItemResult[0].thumbnail;
		//거래 요청 한 상대의 id, 닉네임
		const getAskUserQuery = "SELECT nickname, id FROM user WHERE user_idx = ?";
		const getAskUserResult = await db.queryParam_Parse(getAskUserQuery,[getAskItemResult[0].writer_idx]);
		buf.ask_user_nickname = getAskUserResult[0].nickname;
		buf.ask_user_id = getAskUserResult[0].id;

		//거래를 요청 받은 나의 물품 정보
		const getRequestedItemQuery = "SELECT title, thumbnail FROM item WHERE item_idx = ?";
		const getRequestedItemResult = await db.queryParam_Parse(getRequestedItemQuery,[myTrade[i].to_item_idx]);
		
		buf.requested_item_title = getRequestedItemResult[0].title;
		buf.requested_item_thumbnail = getRequestedItemResult[0].thumbnail;
		buf.requested_item_idx = myTrade[i].to_item_idx;
		
		//거래 요청 시간 추가
		buf.date = myTrade[i].date;
		
		result.push(buf);
	}

	if(!result){
		res.status(400).send(utils.successFalse(statusCode.BAD_REQUEST, resMessage.REQUESTED_ITEM_GET_BAD_RESULT));
	}else{
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.REQUESTED_ITEM_GET_SUCCESS, result));
	}
});

module.exports = router;