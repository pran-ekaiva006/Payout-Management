const express = require('express');
const { getUserBalance, getUserTransactions } = require('../controllers/userController');

const router = express.Router({ mergeParams: true });

router.get('/:id/balance', getUserBalance);
router.get('/:id/transactions', getUserTransactions);

module.exports = router;
