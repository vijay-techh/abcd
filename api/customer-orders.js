const pool = require("./db");

module.exports = async (req, res) => {
  try {
    const { id } = req.query;

    const rows = await pool.query(
      `SELECT id, order_date, rent_start, rent_end, total
       FROM orders
       WHERE customer_id=$1
       ORDER BY id DESC`,
      [id]
    );

    return res.json({ success: true, rows: rows.rows });

  } catch (err) {
    console.error(err);
    return res.json({ success: false });
  }
};
