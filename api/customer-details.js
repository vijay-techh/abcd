const pool = require("./db");

module.exports = async (req, res) => {
  try {
    const { id } = req.query;

    const cust = await pool.query("SELECT * FROM customers WHERE id=$1", [id]);

    if (!cust.rows.length)
      return res.json({ success: false });

    const orders = await pool.query(
      "SELECT * FROM orders WHERE customer_id=$1 ORDER BY id DESC",
      [id]
    );

    const orderDetails = [];

    for (const o of orders.rows) {
      const items = await pool.query(
        "SELECT * FROM order_items WHERE order_id=$1",
        [o.id]
      );
      orderDetails.push({ order: o, items: items.rows });
    }

    return res.json({
      success: true,
      customer: cust.rows[0],
      orderDetails
    });

  } catch (err) {
    console.error(err);
    return res.json({ success: false });
  }
};
