const audioContext = new window.AudioContext();

function StartSending() {
    const text = document.getElementById('messageTextarea').value.toUpperCase();
    document.getElementById('upcomingDiv').innerText = text;
    document.getElementById('sentDiv').innerText = '';
    SendNextLetter();
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
        '0': '-----', ' ': ' '
    };
    const symbols = morseCode[letter.toUpperCase()];

    if (!symbols) {
        console.error(`Unknown letter: ${letter}`);
        return null;
    }

    return symbols;
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

    const upcomingDiv = document.getElementById('upcomingDiv');
    const sendingDiv = document.getElementById('sendingDiv');
    const sendingRow = document.getElementById('sendingRow');
    const sentDiv = document.getElementById('sentDiv');

    if (upcomingDiv.innerText) {
        sendingRow.classList.remove('invisible');
    } else {
        sendingRow.classList.add('invisible');
        return;
    }

    const letter = upcomingDiv.innerText[0];
    const symbols = GetLetterSymbols(letter);

    upcomingDiv.innerText = upcomingDiv.innerText.substring(1);
    sendingDiv.innerText = `${letter} ${symbols}`;
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
    const wave = [];
    symbols.split("").forEach(symbol => {
        if (symbol == '.') {
            wave.push(...GetToneWaveform(msPerUnit));
            wave.push(...GetToneWaveform(msPerUnit, 0));
        } else if (symbol == '-') {
            wave.push(...GetToneWaveform(msPerUnit * 3));
            wave.push(...GetToneWaveform(msPerUnit, 0));
        } else if (symbol == ' ') {
            wave.push(...GetToneWaveform(msPerUnit * 7, 0));
        } else {
            console.error(`Unknown symbol: ${symbol}`);
        }
    });

    PlayWaveform(wave);

    const letterWpm = document.getElementById('letterWpm').value;
    const msPerLetterUnit = 1.2 / letterWpm * 1000;
    const msecForAllSymbols = wave.length / audioContext.sampleRate * 1000;
    const msecBetweenLetters = msPerLetterUnit * 3;
    const msecBeforeNextLetter = msecForAllSymbols + msecBetweenLetters;
    setTimeout(() => { SendNextLetter() }, msecBeforeNextLetter);
}