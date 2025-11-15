const pool = require("./db");

module.exports = async (req, res) => {
  try {
    const { orderId } = req.query;

    const order = await pool.query(
      `SELECT o.*, c.name AS cname, c.phone AS cphone,
              c.alt_phone AS caltphone, c.address AS caddress
       FROM orders o
       JOIN customers c ON c.id=o.customer_id
       WHERE o.id=$1 LIMIT 1`,
      [orderId]
    );

    if (!order.rows.length)
      return res.json({ success: false });

    const items = await pool.query(
      "SELECT * FROM order_items WHERE order_id=$1",
      [orderId]
    );

    return res.json({
      success: true,
      order: order.rows[0],
      items: items.rows
    });

  } catch (err) {
    console.error(err);
    return res.json({ success: false });
  }
};
