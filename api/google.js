module.exports = async (_req, res) => {
  return res.status(410).json({
    error: 'This endpoint has been replaced by Supabase Auth.'
  });
};
