pragma solidity ^0.8.20;

contract SimpleERC20 {
    // State Variabes
    string public name;
    string public symbol;
    string public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public owner;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Constructor
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
    }

    // Functions
    function transfer(address to, uint256 amount) public virtual returns (bool) {
        address from = msg.sender;
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        address owner = msg.sender;
        _approve(owner_, spender, amount);
        return true;
    }

    function transferFrom(
        address from, 
        address to,
        uint256 amount
    ) public virtual returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    // Owner Functions
    function mint(address amount, uint256 amount) public onlyOwner {
        require(account != address(0), "Mint to the zero address");
        totalSupply += amount;
        balanceOf[amount] += amount;
        emit Transfer(address(0), account, amount);
    }

    // Internal Functions
    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(from != address(0), "Transfer from the zero address");
        require(to != address(0), "Transfer to the zero address");
        require(balanceOf[from] >= amount, "Transfer amount exceeds balance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal virtual {
        require(owner_ != address(0), "Approve from the zero address");
        require(spender != address(0), "Approve to the zero address");

        allowance[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    function _spendAllowance(address owner_, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = allowance[owner_][spender];
        if(currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "Insufficient allowance");
            _approve(owner_, spender, currentAllowance - amount);
        }
    }
}