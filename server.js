const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const port = 3000;

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// serve ไฟล์ statics (html, css, js, รูปต่าง ๆ) จากโฟลเดอร์ปัจจุบัน
app.use(express.static(__dirname, { index: false }));

// ให้ root (/) เปิดหน้า login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ===== Database & Server Initialization =====
let db; // Global database pool variable

const initApp = async () => {
    console.log('Initializing application...');

    // 1. Create a temporary connection to set global MySQL configuration
    const tempConnection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'shoppingWebsite'
    });

    const setGlobalConfig = () => {
        return new Promise((resolve, reject) => {
            tempConnection.connect(err => {
                if (err) {
                    console.error('Initial DB connection failed:', err);
                    reject(err);
                    return;
                }
                console.log('Temporary connection established');

                // Increase max_allowed_packet to 64MB globally
                tempConnection.query('SET GLOBAL max_allowed_packet = 67108864', (err) => {
                    tempConnection.end(); // Close temp connection
                    if (err) {
                        console.error('Failed to set max_allowed_packet:', err);
                        // We continue even if this fails, as it might already be set
                        resolve();
                    } else {
                        console.log('Successfully set max_allowed_packet to 64MB');
                        resolve();
                    }
                });
            });
        });
    };

    try {
        await setGlobalConfig();

        // 2. Create the Connection Pool
        db = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'shoppingWebsite',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Verify pool connection
        db.getConnection((err, connection) => {
            if (err) {
                console.error('Error connecting to database pool:', err);
                process.exit(1); // Fatal error
            }
            console.log('Connected to database via pool');
            connection.release();

            // 3. Initialize Tables
            initializeTables();
        });

        // 4. Start Server
        const server = app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });

        server.on('error', (error) => {
            console.error('Server error:', error);
        });

    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
};

const initializeTables = () => {
    // Create users table
    const createUsersTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(createUsersTableSql, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('Users table ready');
    });

    // Create products table
    const createProductsTableSql = `
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            image_data LONGBLOB,
            image_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;
    db.query(createProductsTableSql, (err) => {
        if (err) console.error('Error creating products table:', err);
        else console.log('Products table ready');
    });

    // Create cart table
    const createCartTableSql = `
        CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `;
    db.query(createCartTableSql, (err) => {
        if (err) console.error('Error creating cart table:', err);
        else console.log('Cart table ready');
    });
};

// Start the initialization process
initApp();

// ============ ROUTES API ============

// Register
app.post('/api/register', (req, res) => {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const checkUserSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserSql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const insertSql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            db.query(insertSql, [fullname, email, hashedPassword], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error registering user' });
                }
                res.json({ message: 'Registration successful' });
            });
        } catch (error) {
            console.error('Hashing error:', error);
            res.status(500).json({ message: 'Error processing registration' });
        }
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            const user = results[0];

            try {
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    // ตัด password ทิ้งก่อนส่งกลับไปให้ฝั่ง front-end
                    const { password: _password, ...userWithoutPassword } = user;
                    res.json({ message: 'Login successful', user: userWithoutPassword });
                } else {
                    res.status(401).json({ message: 'Invalid email or password' });
                }
            } catch (error) {
                console.error('Comparison error:', error);
                res.status(500).json({ message: 'Error processing login' });
            }
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    });
});

// ===== Multer สำหรับอัปโหลดรูป =====
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
});

// Middleware to handle multer errors
const uploadMiddleware = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
            }
            return res.status(500).json({ message: err.message });
        } else if (err) {
            return res.status(500).json({ message: 'Error uploading file' });
        }
        next();
    });
};

// Add Product
app.post('/api/add-product', uploadMiddleware, (req, res) => {
    const { userId, name, description, price } = req.body;
    const image = req.file;

    if (!userId || !name || !description || !price || !image) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = `
        INSERT INTO products (user_id, name, description, price, image_data, image_type, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const imageUrlPlaceholder = '';

    db.query(
        sql,
        [userId, name, description, price, image.buffer, image.mimetype, imageUrlPlaceholder],
        (err, result) => {
            if (err) {
                console.error('Error adding product:', err);
                return res.status(500).json({ message: 'Error adding product' });
            }
            res.json({ message: 'Product added successfully', productId: result.insertId });
        }
    );
});

// Get all products
app.get('/api/products', (req, res) => {
    const sql = 'SELECT * FROM products ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ message: 'Error fetching products' });
        }

        // Convert BLOB to Base64 for frontend display
        const products = results.map(product => {
            let imageBase64 = null;
            if (product.image_data) {
                imageBase64 = `data:${product.image_type};base64,${product.image_data.toString('base64')}`;
            }
            return {
                ...product,
                imageUrl: imageBase64 || product.image_url // Use BLOB if available, else fallback to URL
            };
        });

        res.json(products);
    });
});

// ============ CART API ============

// Add to Cart
app.post('/api/cart/add', (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
        return res.status(400).json({ message: 'User ID and Product ID are required' });
    }

    // Check if item already exists in cart
    const checkSql = 'SELECT * FROM cart WHERE user_id = ? AND product_id = ?';
    db.query(checkSql, [userId, productId], (err, results) => {
        if (err) {
            console.error('Error checking cart:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            // Update quantity
            const updateSql = 'UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?';
            db.query(updateSql, [userId, productId], (err) => {
                if (err) {
                    console.error('Error updating cart:', err);
                    return res.status(500).json({ message: 'Error updating cart' });
                }
                res.json({ message: 'Cart updated successfully' });
            });
        } else {
            // Insert new item
            const insertSql = 'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)';
            db.query(insertSql, [userId, productId], (err) => {
                if (err) {
                    console.error('Error adding to cart:', err);
                    return res.status(500).json({ message: 'Error adding to cart' });
                }
                res.json({ message: 'Added to cart successfully' });
            });
        }
    });
});

// Get Cart Items
app.get('/api/cart/:userId', (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT c.id as cart_id, c.quantity, p.* 
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching cart:', err);
            return res.status(500).json({ message: 'Error fetching cart' });
        }

        // Convert BLOB to Base64 for frontend display
        const cartItems = results.map(item => {
            let imageBase64 = null;
            if (item.image_data) {
                imageBase64 = `data:${item.image_type};base64,${item.image_data.toString('base64')}`;
            }
            return {
                ...item,
                imageUrl: imageBase64 || item.image_url
            };
        });

        res.json(cartItems);
    });
});

// Remove from Cart
app.delete('/api/cart/:cartId', (req, res) => {
    const cartId = req.params.cartId;

    const sql = 'DELETE FROM cart WHERE id = ?';
    db.query(sql, [cartId], (err, result) => {
        if (err) {
            console.error('Error removing from cart:', err);
            return res.status(500).json({ message: 'Error removing from cart' });
        }
        res.json({ message: 'Item removed from cart' });
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});