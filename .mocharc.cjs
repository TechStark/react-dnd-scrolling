module.exports = {
	require: ['@babel/register', 'test/setup.js'],
	ui: 'bdd',
  "node-option": [
    "loader=@node-loader/babel",
  ]
}
