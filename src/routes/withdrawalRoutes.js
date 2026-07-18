const express = require('express');
const { withdraw } = require('../controllers/withdrawalController');

const router = express.Router({ mergeParams: true });

router.post('/:id/withdraw', withdraw);

module.exports = router;
