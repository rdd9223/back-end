var express = require('express');
var router = express.Router();
const utils = require('../../module/utils/utils');
const resMessage = require('../../module/utils/responseMessage');
const statusCode = require('../../module/utils/statusCode');
const db = require('../../module/pool');
const authUtils = require('../../module/utils/authUtils');
const upload = require('../../config/multer');
const jwt = require('../../module/jwt');

/* GET home page. */

router.get('/:user_idx', async(req,res) =>{

  const userIdx = req.params.user_idx;

  // 찜 상품의 이름과 썸네일을 가져옵니다.
  const getLikeQuery = `SELECT thumbnail, title FROM item WHERE item_idx IN (SELECT item_idx FROM heart WHERE user_idx = ${userIdx}) ORDER BY writer_idx `;
  // 찜 상품의 닉네임과 아이디를 가져옵니다.
  const getLikeItemRegUserQuery = `SELECT nickname, id FROM user WHERE user_idx` 
  									+`IN (SELECT writer_idx FROM item WHERE item_idx` 
									+`IN (SELECT item_idx FROM heart WHERE user_idx = ${userIdx}))`
  const getLikeResult = await db.queryParam_Parse(getLikeQuery,[userIdx]);
  const getLikeItemRegUserResult = await db.queryParam_Parse(getLikeItemRegUserQuery, [userIdx]);

  //2개의 쿼리문에 있는 상품의 정보(닉네임, 아이디, 썸네일, 타이틀)을 합칩니다.
  for(i in getLikeItemRegUserResult){
    getLikeItemRegUserResult[i].thumbnail = getLikeResult[i].thumbnail;
    getLikeItemRegUserResult[i].title = getLikeResult[i].title;
  }
  if(!getLikeResult){
      res.status(400).send(utils.successFalse(statusCode.BAD_REQUEST, resMessage.GET_BAD_RESULT));
  }else{
      res.status(200).send(utils.successTrue(statusCode.OK, resMessage.SUCCESS_GET_ITEM, getLikeResult));
  }
});

/*  
	찜 버튼 상호작용 
	찜 등록/취소 하기
*/
router.post('/:item_idx', async(req,res) =>{

	const itemIdx = req.params.item_idx;
	const userIdx = 2;

	//user가 상품을 찜했는지 확인합니다.
	const isHeartQuery = "SELECT EXISTS (SELECT * FROM heart WHERE user_idx = ? AND item_idx = ?) as SUCCESS"
	const isHeartResult = await db.queryParam_Parse(isHeartQuery, [userIdx, itemIdx]);

	if(isHeartResult[0]["SUCCESS"] == 1){
		//상품을 찜 해놓았을 경우 취소합니다.
		const delHeartQuery = "Delete FROM heart WHERE user_idx = ? AND item_idx = ?"
		const delHeartResult = await db.queryParam_Parse(delHeartQuery, [userIdx, itemIdx]);
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.DEL_LIKED_ITEM, delHeartResult));
	}else{
		//상품을 찜 하지 않았을 경우 등록합니다.
		const addHeartQuery = "INSERT INTO heart (user_idx, item_idx) VALUES (?,?)" 
		const addHeartResult = await db.queryParam_Parse(addHeartQuery, [userIdx, itemIdx]);
		res.status(200).send(utils.successTrue(statusCode.OK, resMessage.ADD_LIKED_ITEM, addHeartResult));
	}

});

module.exports = router;

/*
찜 목록 불러오기
찜 등록 / 취소 하기
*/