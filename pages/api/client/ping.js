export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple ping endpoint to test API connectivity
  res.status(200).json({ 
    status: 'ok',
    message: 'pong',
    timestamp: new Date().toISOString()
  });
}

