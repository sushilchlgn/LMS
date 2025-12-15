// products.test.js
const request = require('supertest');
const app = require('./server'); // Import your Express app instance
const db = require('./db');      // Import your database connection

describe('Product CRUD API', () => {
    let productId; // To store the ID of the product we create

    // Before all tests, clear the test database
    beforeAll(async () => {
        await db.query('DELETE FROM products');
    });

    // --- TEST C: CREATE ---
    it('should create a new product on POST /products', async () => {
        const response = await request(app)
            .post('/products')
            .send({
                name: 'Test Product',
                price: 99.99,
                description: 'A product for testing.'
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        productId = response.body.id; // Save ID for later tests
    });

    // --- TEST R: READ ONE ---
    it('should return the created product on GET /products/:id', async () => {
        const response = await request(app)
            .get(`/products/${productId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe('Test Product');
        expect(response.body).toHaveProperty('price', '99.99'); // Note: MySQL returns decimals as strings
    });

    // --- TEST U: UPDATE ---
    it('should update the product price on PUT /products/:id', async () => {
        const response = await request(app)
            .put(`/products/${productId}`)
            .send({ price: 109.99 });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Product updated successfully');
    });

    // --- TEST D: DELETE ---
    it('should delete the product on DELETE /products/:id', async () => {
        const response = await request(app)
            .delete(`/products/${productId}`);

        expect(response.statusCode).toBe(204);

        // Verify it was deleted (expect 404)
        const checkResponse = await request(app)
            .get(`/products/${productId}`);
        expect(checkResponse.statusCode).toBe(404);
    });

    // After all tests, clean up or close connections
    afterAll(async () => {
        // You would typically close the database connection pool here
        // if your db setup required it, but mysql2 pool handles this well.
    });
});