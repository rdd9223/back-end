const poolPromise = require('../config/dbConfig')
module.exports = {
    queryParam_None: async (query) => {
        let result = null;
        try {
            const pool = await poolPromise;
            const connection = await pool.getConnection();
            try {
                result = await connection.query(query) || null;
            } catch (queryError) {
                connection.rollback(() => {});
                console.log(queryError);
            }
            pool.releaseConnection(connection);
        } catch (connectionError) {
            console.log(connectionError);
        }
        return result;
    },
    queryParam_Arr: async (...args) => {
        return this.queryParam_Parse(args[0], args[1]);
    },
    queryParam_Parse: async (query, value) => {
        let result = null;
        try {
            const pool = await poolPromise;
            const connection = await pool.getConnection();
            try {
                result = await connection.query(query, value) || null;
            } catch (queryError) {
                connection.rollback(() => {});
                console.log(queryError);
            }
            pool.releaseConnection(connection);
        } catch (connectionError) {
            console.log(connectionError);
        }
        return result;
    },
    Transaction: async (...args) => {
        let result = true;
        try {
            const pool = await poolPromise;
            const connection = await pool.getConnection()
            try {
                await connection.beginTransaction();
                args.forEach(async (it) => await it(connection));
                await connection.commit();
            } catch (transactionError) {
                await connection.rollback();
                console.log(transactionError);
                result = false;
            }
            pool.releaseConnection(connection);
        } catch (connectionError) {
            console.log(connectionError);
            result = false;
        }
        return result;
    }
} 
