import { useState, useEffect } from 'react';
import { getStorage } from '../hooks/useStorage';

interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

const sampleProducts: Product[] = [
  { name: 'Laptop', price: 999, category: 'electronics', inStock: true },
  { name: 'Mouse', price: 29, category: 'electronics', inStock: true },
  { name: 'Desk', price: 299, category: 'furniture', inStock: false },
  { name: 'Chair', price: 199, category: 'furniture', inStock: true },
  { name: 'Keyboard', price: 79, category: 'electronics', inStock: true },
  { name: 'Monitor', price: 349, category: 'electronics', inStock: false },
];

export default function QueryPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const storage = getStorage();

  useEffect(() => {
    checkProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkProducts = async () => {
    const existing = await storage.get('demo:product:0');
    setProductsLoaded(existing !== null);
  };

  const loadSampleData = async () => {
    try {
      for (let i = 0; i < sampleProducts.length; i++) {
        await storage.set(`demo:product:${i}`, sampleProducts[i], {
          tags: ['product', sampleProducts[i].category],
        });
      }
      setResult(`Loaded ${sampleProducts.length} products with tags`);
      setStatus('success');
      setProductsLoaded(true);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const queryByTag = async (tag: string) => {
    try {
      const results = await storage.query({ tags: { $in: [tag] } });
      if (results.length > 0) {
        setResult(`Found ${results.length} items with tag "${tag}":\n${JSON.stringify(results, null, 2)}`);
        setStatus('success');
      } else {
        setResult(`No items found with tag "${tag}"`);
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const queryByPrice = async (operator: string) => {
    try {
      let query;
      let desc;
      if (operator === 'lt100') {
        query = { price: { $lt: 100 } };
        desc = 'under $100';
      } else if (operator === 'gte200') {
        query = { price: { $gte: 200 } };
        desc = '$200 and above';
      } else {
        query = { price: { $gte: 100, $lt: 300 } };
        desc = '$100-$300';
      }

      const results = await storage.query(query);
      if (results.length > 0) {
        setResult(`Found ${results.length} items ${desc}:\n${JSON.stringify(results, null, 2)}`);
        setStatus('success');
      } else {
        setResult(`No items found ${desc}`);
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const queryInStock = async () => {
    try {
      const results = await storage.query({ inStock: true });
      if (results.length > 0) {
        setResult(`Found ${results.length} in-stock items:\n${JSON.stringify(results, null, 2)}`);
        setStatus('success');
      } else {
        setResult('No in-stock items found');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const queryByPattern = async () => {
    try {
      const results = await storage.query({ name: { $regex: '^[KM]' } });
      if (results.length > 0) {
        setResult(
          `Found ${results.length} items starting with K or M:\n${JSON.stringify(results, null, 2)}`
        );
        setStatus('success');
      } else {
        setResult('No items found matching pattern');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const queryComplex = async () => {
    try {
      const results = await storage.query({
        $and: [{ category: 'electronics' }, { price: { $gte: 50 } }, { inStock: true }],
      });
      if (results.length > 0) {
        setResult(
          `Found ${results.length} in-stock electronics >= $50:\n${JSON.stringify(results, null, 2)}`
        );
        setStatus('success');
      } else {
        setResult('No items matched complex query');
        setStatus('error');
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <h1 className="page-title">Query Engine</h1>
      <p className="page-desc">Filter and search stored data using tags, operators, and regex.</p>

      <div className="card">
        <h2 className="card-title">Sample Data</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
          {productsLoaded ? 'Sample products are loaded. Try the queries below.' : 'Load sample products to test queries.'}
        </p>
        <button className="btn btn-primary" onClick={loadSampleData}>
          {productsLoaded ? 'Reload' : 'Load'} Sample Products
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Query by Tag</h2>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => queryByTag('electronics')}>
            Electronics
          </button>
          <button className="btn btn-secondary" onClick={() => queryByTag('furniture')}>
            Furniture
          </button>
          <button className="btn btn-secondary" onClick={() => queryByTag('product')}>
            All Products
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Query by Price</h2>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => queryByPrice('lt100')}>
            Under $100
          </button>
          <button className="btn btn-secondary" onClick={() => queryByPrice('range')}>
            $100-$300
          </button>
          <button className="btn btn-secondary" onClick={() => queryByPrice('gte200')}>
            $200+
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Advanced Queries</h2>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={queryInStock}>
            In Stock Only
          </button>
          <button className="btn btn-secondary" onClick={queryByPattern}>
            Name Starts with K or M
          </button>
          <button className="btn btn-primary" onClick={queryComplex}>
            Electronics, In Stock, $50+
          </button>
        </div>
      </div>

      {result && (
        <div className="result">
          <div className="result-label">Query Result</div>
          <pre className={`result-value ${status}`}>{result}</pre>
        </div>
      )}
    </div>
  );
}
