let audioContext = null;
let isSending = false;

function ToggleMessageVisibility() {
    console.log('toggling');
    if (document.getElementById('showTextCheck').checked) {
        document.getElementById('outgoingMessageDiv').classList.remove('collapse');
    } else {
        document.getElementById('outgoingMessageDiv').classList.add('collapse');
    }
}

function ShowMessageRow() {
    document.getElementById('messageRow').classList.remove("collapse");
}

function SetSpinner(visible) {
    const spinner = document.getElementById('spinner');
    if (visible) {
        spinner.classList.remove('invisible');
    } else {
        spinner.classList.add('invisible');
    }
}

function SetMessage(message) {
    document.getElementById('messageTextarea').value = message;
}
function StopSending() {
    document.getElementById('upcomingDiv').innerText = '';
}

let IsPaused = false;
function PauseSending() {
    IsPaused = !IsPaused;
}

function StartSending() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    let message = document.getElementById('messageTextarea').value.toUpperCase();
    message = message
        .replaceAll("\n\n", "\n")
        .replaceAll(":", ".")
        .replaceAll("[", "(")
        .replaceAll("]", ")")
        .replaceAll("(", "")
        .replaceAll(")", "")
    message = message.replace(/(?:\r\n|\r|\n)/g, ' - ');

    document.getElementById('upcomingDiv').innerText = message;
    document.getElementById('sentDiv').innerText = '';
    if (!isSending) {
        isSending = true;
        SendNextLetter();
    }
}

function GetLetterSymbols(letter) {
    const morseCode = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
        'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
        'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
        'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
        'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
        'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        '0': '-----',
        ' ': ' ',
        '?': '..--..',
        ',': '--..--',
        '.': '-...-',
        '-': '-...-',
        '–': '-...-',
    };
    return morseCode[letter.toUpperCase()];
}

function PlayWaveform(arr) {
    var buf = new Float32Array(arr.length)
    for (var i = 0; i < arr.length; i++) buf[i] = arr[i]
    var buffer = audioContext.createBuffer(1, buf.length, audioContext.sampleRate)
    buffer.copyToChannel(buf, 0)
    var source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

function GetToneWaveform(durationMsec, volume = 0.5) {
    if (!durationMsec)
        return;
    const values = [];
    const toneHz = 600;
    const sampleFreq = audioContext.sampleRate / toneHz;
    const fadeTimeMsec = 10;
    const totalSamples = audioContext.sampleRate * durationMsec / 1000;
    const fadeSamples = audioContext.sampleRate * fadeTimeMsec / 1000;
    for (var i = 0; i < totalSamples; i++) {
        values[i] = Math.sin(i / (sampleFreq / (Math.PI * 2))) * volume

        // cosine envelope the start and end
        const isRising = i < fadeSamples;
        const isFalling = i > totalSamples - fadeSamples;
        if (isRising || isFalling) {
            const frac = isRising
                ? 1 - (fadeSamples - i) / fadeSamples
                : (totalSamples - i) / fadeSamples;
            multiplier = 1 - Math.cos(frac * Math.PI / 2);
            values[i] *= multiplier;
        }
    }
    return values;
}

function SendNextLetter() {

    if (IsPaused) {
        setTimeout(() => { SendNextLetter() }, 100);
        return;
    }

    const upcomingDiv = document.getElementById('upcomingDiv');
    const sendingDiv = document.getElementById('sendingDiv');
    const sentDiv = document.getElementById('sentDiv');

    if (!upcomingDiv.innerText) {
        isSending = false;
        sendingDiv.innerText = ' ';
        sentDiv.innerText = ' ';
        return;
    }

    let letter = upcomingDiv.innerText[0];
    let symbols = GetLetterSymbols(letter);
    if (!symbols) {
        letter = '?';
        symbols = GetLetterSymbols('?');
    }

    upcomingDiv.innerText = upcomingDiv.innerText.substring(1);
    sendingDiv.innerText = letter == ' ' ? '(space)' : `${letter} ${symbols}`;
    sentDiv.innerText += letter;

    /*
    The length of a dot is 1 time unit.
    A dash is 3 time units.
    The space between symbols (dots and dashes) of the same letter is 1 time unit.
    The space between letters is 3 time units.
    The space between words is 7 time units.
    */

    const symbolWPM = document.getElementById('symbolWpm').value;
    const msPerUnit = 1.2 / symbolWPM * 1000;

    const letterWpm = document.getElementById('letterWpm').value;
    const msPerLetterUnit = 1.2 / letterWpm * 1000;
    const msecBetweenLetters = msPerLetterUnit * 3;

    const wave = [];
    symbols.split("").forEach(symbol => {
        if (symbol == '.') {
            wave.push(...GetToneWaveform(msPerUnit));
            wave.push(...GetToneWaveform(msPerUnit, 0));
        } else if (symbol == '-') {
            wave.push(...GetToneWaveform(msPerUnit * 3));
            wave.push(...GetToneWaveform(msPerUnit, 0));
        } else if (symbol == ' ') {
            // leave wave empty
        } else {
            console.error(`Unknown symbol: ${symbol}`);
        }
    });

    if (wave.length) {
        PlayWaveform(wave);
    }

    const msecForAllSymbols = wave.length / audioContext.sampleRate * 1000;
    const msecBeforeNextLetter = msecForAllSymbols + msecBetweenLetters;
    setTimeout(() => { SendNextLetter() }, msecBeforeNextLetter);
}