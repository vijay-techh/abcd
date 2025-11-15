const pool = require("./db");
const dayjs = require("dayjs");
const { v4: uuidv4 } = require("uuid");

module.exports = async (req, res) => {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const client = await pool.connect();

  try {
    const {
      name, phone, alt_phone, address,
      rent_start, rent_end, items = []
    } = req.body;

    if (!name || !phone || !address)
      return res.json({ success: false, error: "Missing required fields" });

    if (!items.length)
      return res.json({ success: false, error: "No product items found" });

    await client.query("BEGIN");

    let c = await client.query("SELECT id FROM customers WHERE phone=$1", [phone]);

    let customerId;

    if (c.rows.length) {
      customerId = c.rows[0].id;
    } else {
      const newC = await client.query(
        `INSERT INTO customers (name, phone, alt_phone, address)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [name, phone, alt_phone || null, address]
      );
      customerId = newC.rows[0].id;
    }

    const orderDate = dayjs().format("YYYY-MM-DD");

    const order = await client.query(
      `INSERT INTO orders (invoice_no, customer_id, order_date, rent_start, rent_end, total)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        uuidv4(),
        customerId,
        orderDate,
        rent_start || null,
        rent_end || null,
        0
      ]
    );

    const orderId = order.rows[0].id;

    let total = 0;

    for (const it of items) {
      const line = Number(it.price) * Number(it.quantity);
      total += line;

      await client.query(
        `INSERT INTO order_items (order_id, product, price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.product, it.price, it.quantity, line]
      );
    }

    await client.query("UPDATE orders SET total=$1 WHERE id=$2", [total, orderId]);

    await client.query("COMMIT");

    return res.json({ success: true, orderId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Generate bill error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
