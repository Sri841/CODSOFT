// Sound generator using Web Audio API for a soft click
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Frequency in Hz
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
}

// DOM Elements
const currentOperandTextElement = document.getElementById('currentOperand');
const previousOperandTextElement = document.getElementById('previousOperand');
const keypadWrapper = document.getElementById('keypadWrapper');
const dotBasic = document.getElementById('dotBasic');
const dotSci = document.getElementById('dotSci');
const calculatorContainer = document.getElementById('calculatorContainer');
const historyPanel = document.getElementById('historyPanel');
const historyToggleBtn = document.getElementById('historyToggleBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('historyList');
const angleModeIndicator = document.getElementById('angleModeIndicator');
const toggleAngleBtn = document.getElementById('toggleAngleBtn');

// State Variables
let currentOperand = '0';
let previousOperand = '';
let operation = undefined;
let isScientificMode = false;
let isRadianMode = true;
let history = [];
let shouldResetScreen = false;

// Format Numbers
function getDisplayNumber(number) {
    const stringNumber = number.toString();
    if (stringNumber === 'NaN') return 'Error';
    if (stringNumber === 'Infinity') return '∞';
    if (stringNumber === '-Infinity') return '-∞';
    
    // For scientific notation or errors
    if (stringNumber.includes('e')) {
        return Number(number).toPrecision(6);
    }

    const integerDigits = parseFloat(stringNumber.split('.')[0]);
    const decimalDigits = stringNumber.split('.')[1];
    let integerDisplay;
    
    if (isNaN(integerDigits)) {
        integerDisplay = '';
    } else {
        integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
    }

    if (decimalDigits != null) {
        return `${integerDisplay}.${decimalDigits}`;
    } else {
        return integerDisplay;
    }
}

// Update Display
function updateDisplay() {
    // Adjust font size based on length
    if (currentOperand.length > 15) {
        currentOperandTextElement.className = 'current-operand very-small-text';
    } else if (currentOperand.length > 9) {
        currentOperandTextElement.className = 'current-operand small-text';
    } else {
        currentOperandTextElement.className = 'current-operand';
    }

    // Handle special constants which shouldn't be formatted with commas internally if they are expressions
    if (currentOperand === 'Error' || currentOperand === 'NaN') {
        currentOperandTextElement.innerText = 'Error';
    } else if (currentOperand === '-') {
        currentOperandTextElement.innerText = '-';
    } else {
        currentOperandTextElement.innerText = getDisplayNumber(currentOperand);
    }
    
    if (operation != null) {
        previousOperandTextElement.innerText = `${getDisplayNumber(previousOperand)} ${operation}`;
    } else {
        previousOperandTextElement.innerText = previousOperand;
    }
}

// Core Operations
function clear() {
    currentOperand = '0';
    previousOperand = '';
    operation = undefined;
}

function appendNumber(number) {
    if (shouldResetScreen) {
        currentOperand = '';
        shouldResetScreen = false;
    }
    if (number === '.' && currentOperand.includes('.')) return;
    if (currentOperand === '0' && number !== '.') {
        currentOperand = number.toString();
    } else {
        currentOperand = currentOperand.toString() + number.toString();
    }
}

function chooseOperation(op) {
    if (currentOperand === '' && op === '-') {
        currentOperand = '-';
        return;
    }
    if (currentOperand === '') return;
    if (previousOperand !== '') {
        compute();
    }
    operation = op;
    previousOperand = currentOperand;
    currentOperand = '';
}

function compute() {
    let computation;
    const prev = parseFloat(previousOperand);
    const current = parseFloat(currentOperand);
    
    if (isNaN(prev) || isNaN(current)) return;
    
    switch (operation) {
        case '+':
            computation = prev + current;
            break;
        case '-':
            computation = prev - current;
            break;
        case '×':
            computation = prev * current;
            break;
        case '÷':
            computation = prev / current;
            break;
        default:
            return;
    }
    
    // Fix floating point issues
    computation = Math.round(computation * 10000000000000) / 10000000000000;
    
    addToHistory(`${getDisplayNumber(prev)} ${operation} ${getDisplayNumber(current)}`, computation);
    
    currentOperand = computation.toString();
    operation = undefined;
    previousOperand = '';
    shouldResetScreen = true;
}

// Scientific Operations
function computeScientific(sciOp) {
    let current = parseFloat(currentOperand);
    if (isNaN(current) && sciOp !== 'pi' && sciOp !== 'e') return;
    
    let computation;
    let expression = '';

    // Helpers
    const toRad = (val) => isRadianMode ? val : val * (Math.PI / 180);
    const toDeg = (val) => isRadianMode ? val : val * (180 / Math.PI);

    switch (sciOp) {
        case 'sin':
            computation = Math.sin(toRad(current));
            expression = `sin(${current})`;
            break;
        case 'cos':
            computation = Math.cos(toRad(current));
            expression = `cos(${current})`;
            break;
        case 'tan':
            computation = Math.tan(toRad(current));
            expression = `tan(${current})`;
            break;
        case 'log':
            computation = Math.log10(current);
            expression = `log(${current})`;
            break;
        case 'ln':
            computation = Math.log(current);
            expression = `ln(${current})`;
            break;
        case 'sqrt':
            computation = Math.sqrt(current);
            expression = `√(${current})`;
            break;
        case 'square':
            computation = Math.pow(current, 2);
            expression = `(${current})²`;
            break;
        case 'inv':
            computation = 1 / current;
            expression = `1/(${current})`;
            break;
        case 'exp':
            computation = Math.exp(current);
            expression = `e^(${current})`;
            break;
        case 'fact':
            if (current < 0 || !Number.isInteger(current)) {
                computation = NaN;
            } else {
                let fact = 1;
                for (let i = 2; i <= current; i++) fact *= i;
                computation = fact;
            }
            expression = `${current}!`;
            break;
        case 'pi':
            computation = Math.PI;
            currentOperand = computation.toString();
            shouldResetScreen = true;
            updateDisplay();
            return;
        case 'e':
            computation = Math.E;
            currentOperand = computation.toString();
            shouldResetScreen = true;
            updateDisplay();
            return;
        case 'pow': // x^y needs two operands, acts like an operator
            chooseOperation('^');
            return;
    }

    // Fix floating point tiny values (e.g. sin(pi))
    if (Math.abs(computation) < 1e-10) computation = 0;
    
    addToHistory(expression, computation);
    currentOperand = computation.toString();
    shouldResetScreen = true;
}

function handlePow() {
    let computation;
    const prev = parseFloat(previousOperand);
    const current = parseFloat(currentOperand);
    if (isNaN(prev) || isNaN(current)) return;
    
    computation = Math.pow(prev, current);
    addToHistory(`${prev} ^ ${current}`, computation);
    
    currentOperand = computation.toString();
    operation = undefined;
    previousOperand = '';
    shouldResetScreen = true;
}

// Single Action Operators (+/-, %)
function toggleSign() {
    if (currentOperand === '') return;
    currentOperand = (parseFloat(currentOperand) * -1).toString();
}

function calculatePercentage() {
    if (currentOperand === '') return;
    currentOperand = (parseFloat(currentOperand) / 100).toString();
}

// History Panel Logic
function addToHistory(expression, result) {
    history.unshift({ expression, result: result.toString() });
    if (history.length > 20) history.pop();
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.innerHTML = `
            <div class="hist-expr">${item.expression} =</div>
            <div class="hist-result">${getDisplayNumber(item.result)}</div>
        `;
        historyItem.addEventListener('click', () => {
            playClickSound();
            currentOperand = item.result;
            shouldResetScreen = true;
            historyPanel.classList.remove('show');
            updateDisplay();
        });
        historyList.appendChild(historyItem);
    });
}

clearHistoryBtn.addEventListener('click', () => {
    playClickSound();
    history = [];
    renderHistory();
});

historyToggleBtn.addEventListener('click', () => {
    playClickSound();
    historyPanel.classList.toggle('show');
});

closeHistoryBtn.addEventListener('click', () => {
    playClickSound();
    historyPanel.classList.remove('show');
});

// Event Listeners for Buttons
document.querySelectorAll('.btn-number').forEach(button => {
    button.addEventListener('click', () => {
        playClickSound();
        appendNumber(button.dataset.number);
        updateDisplay();
    });
});

document.querySelectorAll('.btn-operator').forEach(button => {
    button.addEventListener('click', () => {
        playClickSound();
        if (button.dataset.action === 'equals') {
            if (operation === '^') {
                handlePow();
            } else {
                compute();
            }
        } else {
            chooseOperation(button.dataset.operation);
        }
        updateDisplay();
    });
});

document.querySelectorAll('.btn-action').forEach(button => {
    button.addEventListener('click', () => {
        playClickSound();
        const action = button.dataset.action;
        if (action === 'clear') clear();
        if (action === 'toggle-sign') toggleSign();
        if (action === 'percent') calculatePercentage();
        if (action === 'toggle-angle') {
            isRadianMode = !isRadianMode;
            button.innerText = isRadianMode ? 'RAD' : 'DEG';
            angleModeIndicator.innerText = isRadianMode ? 'RAD' : 'DEG';
        }
        updateDisplay();
    });
});

document.querySelectorAll('.btn-sci').forEach(button => {
    button.addEventListener('click', () => {
        playClickSound();
        computeScientific(button.dataset.sci);
        updateDisplay();
    });
});

// Swipe and Mode Switching Logic
function switchToScientific() {
    keypadWrapper.style.transform = 'translateX(-50%)';
    dotBasic.classList.remove('active');
    dotSci.classList.add('active');
    isScientificMode = true;
}

function switchToBasic() {
    keypadWrapper.style.transform = 'translateX(0)';
    dotSci.classList.remove('active');
    dotBasic.classList.add('active');
    isScientificMode = false;
}

// Desktop button switch
document.getElementById('switchToBasicBtn').addEventListener('click', () => {
    playClickSound();
    switchToBasic();
});

document.getElementById('switchToSciBtn').addEventListener('click', () => {
    playClickSound();
    switchToScientific();
});

// Touch Swipe Detection
let touchStartX = 0;
let touchEndX = 0;

calculatorContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

calculatorContainer.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        // Swipe left
        switchToScientific();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        // Swipe right
        switchToBasic();
    }
}

// Keyboard Support
document.addEventListener('keydown', e => {
    if (e.key >= '0' && e.key <= '9' || e.key === '.') {
        playClickSound();
        appendNumber(e.key);
        updateDisplay();
    }
    if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        playClickSound();
        let op = e.key;
        if (op === '*') op = '×';
        if (op === '/') op = '÷';
        chooseOperation(op);
        updateDisplay();
    }
    if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        playClickSound();
        if (operation === '^') {
            handlePow();
        } else {
            compute();
        }
        updateDisplay();
    }
    if (e.key === 'Backspace') {
        playClickSound();
        if (!shouldResetScreen) {
            currentOperand = currentOperand.toString().slice(0, -1);
            if (currentOperand === '') currentOperand = '0';
            updateDisplay();
        }
    }
    if (e.key === 'Escape') {
        playClickSound();
        clear();
        updateDisplay();
    }
});

// Initialize
clear();
updateDisplay();
