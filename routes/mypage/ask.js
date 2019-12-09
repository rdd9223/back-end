var express = require('express');
var router = express.Router();
const utils = require('../../module/utils/utils');
const resMessage = require('../../module/utils/responseMessage');
const statusCode = require('../../module/utils/statusCode');
const db = require('../../module/pool');
const authUtils = require('../../module/utils/authUtils');

// 내가 요청 한 상품 조회
router.get('/', authUtils.isLoggedin, async(req, res)=>{
	
    const user_idx = req.decoded.idx;//'나'의 idx
    
	//내가 포함 된 거래의 정보를 읽어온다. 오름차순으로 ->시간순
	const getMyTradeQuery = "SELECT * FROM trade WHERE from_user_idx = ? AND state = 0 ORDER BY date ASC";
	const getMyTradeResult = await db.queryParam_Parse(getMyTradeQuery, [user_idx]);

	//아무값도 없다면 값이 비었다는 메세지를 보낸다.
	if(!getMyTradeResult[0]){
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.NULL_VALUE));
		return;
	}


	//추가해야 하는 것 :  상대 물품의 썸네일, 상대 물건의 이름, 상대 닉네임, 상대 아이디, 내 썸네일, 내 물건 이름, 요청한 시간
	/*buf안에 들어갈 객체 : {requested_item_thumbnail : ,requested_item_title:,requested_user_nickname,requested_user_id, 
		ask_item_thumbnail:, ask_item_title:, date:}*/
		
	let buf = [];

	for(let i = 0; i < getMyTradeResult.length; i++){

		
		//내가 교환 신청을 한 상대의 물품 인덱스의 정보를 저장한다.
		const getOtherItemQuery = "SELECT thumbnail, title, writer_idx FROM item WHERE item_idx = ?";
		const getOtherItemResult = await db.queryParam_Parse(getOtherItemQuery, [getMyTradeResult[i].to_item_idx]);
		
		if(!getOtherItemResult[0]){
			res.status(200).send(utils.successTrue(statusCode.OK, resMessage.NULL_VALUE));
			return;
		}

		//교환신청 한 만큼 빈 객체를 만들어준다.
		for(let k = 0; k < getOtherItemResult.length; k++){
			buf.push({});
			//내가 교환 신청을 한 상대물품의 정보를 저장한다.
			buf[i].requested_item_thumbnail = getOtherItemResult[k].thumbnail;
			buf[i].requested_item_title = getOtherItemResult[k].title;
			buf[i].requested_item_idx = getMyTradeResult[i].to_item_idx;
			
			//내가 교환 신청을 한 상대의 유저 정보를 저장한다.
			const getOtherUserQuery = "SELECT nickname, id FROM user WHERE user_idx = ?";
			const getOtherUserResult = await db.queryParam_Parse(getOtherUserQuery, [getOtherItemResult[k].writer_idx]);
			if(!getOtherUserResult[0]){
				res.status(200).send(utils.successTrue(statusCode.OK, resMessage.NULL_VALUE));
				return;
			}

			buf[i].requested_user_nickname = getOtherUserResult[k].nickname;
			buf[i].requested_user_id = getOtherUserResult[k].id;

			//거래 요청 시간을 저장한다.
			buf[i].date = getMyTradeResult[i].date;
		}
		//내가 교환 신청을 한 내 물품 인덱스의 정보를 저장한다.
		
		const getMyItemQuery = "SELECT thumbnail, title, writer_idx FROM item WHERE item_idx = ?";
		const getMyItemResult = await db.queryParam_Parse(getMyItemQuery, [getMyTradeResult[i].from_item_idx]);
		if(!getMyItemResult[0]){
			res.status(200).send(utils.successTrue(statusCode.OK, resMessage.NULL_VALUE));
			return;
		}
		//getMyTradeResult[i].from_item_idx를 item 테이블에서 찾고 썸네일과 title을 저장한다, 
		for(let k = 0; k < getMyItemResult.length; k++){
			buf[i].ask_item_thumbnail = getMyItemResult[k].thumbnail;
			buf[i].ask_item_title = getMyItemResult[k].title;
			buf[i].ask_item_idx = getMyTradeResult[i].from_item_idx;
		}
	}
	
	const result = buf;
	
	if(!result){
		res.status(400).send(utils.successFalse(statusCode.BAD_REQUEST, resMessage.ASK_ITEM_GET_BAD_RESULT));
	}else{
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.ASK_ITEM_GET_SUCCESS, result));
	}

});

module.exports = router;