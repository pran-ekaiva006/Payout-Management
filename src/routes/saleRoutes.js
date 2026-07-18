const express = require('express');
const { reconcile } = require('../controllers/saleController');

const router = express.Router();

router.post('/:id/reconcile', reconcile);

module.exports = router;
