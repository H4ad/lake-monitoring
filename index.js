// #region Imports

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const { config: thinker } = require('./config.js');

const { writeFile } = require('jsonfile');

// #endregion

// #region Reader

// #region Properties

/**
 * A classe que lida com a leitura de dados serial
 */
const port = new SerialPort(thinker.port, {
	baudRate: thinker.baudRate,
});

const parser = new Readline();

port.pipe(parser);

// #endregion

// #region Initializers

/**
 * Método que abre a conexão com a porta serial
 */
const initializeOpenStream = () => {
	port.on('open', onOpenStream);
	port.on('close', () => console.log('Fechou a conexão'));
};

/**
 * Método que inicializa a leitura dos dados serial enviados pela placa
 */
const initializeReadDataStream = () => {
	parser.on('data', onReadDataStream);
};

/**
 * Método que envia dados falsos apenas para testar
 */
const fakeData = () => {
	let counter = 1000;
	let sinalNegative = false;

	initializeThinker();

	setInterval(() => {
		if (sinalNegative) {
			counter--;

			sinalNegative = counter > 1000;
		} else {
			counter++;

			sinalNegative = counter > 4000;
		}

		onReadDataStream(counter);
	}, 1000);
};

// #endregion

// #region Events

/**
 * Método executado após abrir a conexão com a porta serial
 */
const onOpenStream = () => {
	console.log('Conexão aberta.');
	initializeThinker();
	initializeReadDataStream();
};

/**
 * Método que recebe o valor da leitura do potênciometro
 *
 * @param {string} potentiometerPower A potência atual do potênciometro
 */
const onReadDataStream = (potentiometerPower) => {
	const power = +potentiometerPower.toString();

	if (isNaN(power))
		return;

	console.log('Potêncial atual: ', power);

	thinkerProcessMeasurement(power);
};

// #endregion

// #endregion

// #region Thinker

/**
 * Type Defs do Thinker
 *
 * @typedef {{ value: string, time: number }} measurementData As informações de uma medição
 * @typedef {{ isFirstProcess: boolean, measurementData[], measurementMaxToAlert: number }} thinkingData As informações de um pensamento
 * @typedef {{ type: string, elevationAboveAverage: number, lastThinking: thinkingData, currentMeasurementData: measurementData[], time: number }} alertData As informações de um alerta
 */

// #region Properties

/**
 * O buffer de dados do Thinker
 *
 * @type {measurementData[]}
 */
let thinkerBufferData;

/**
 * O ultimo pensamento do Thinker
 *
 * @type {thinkingData}
 */
let thinkerLastThinking;

/**
 * A contagem até o Thinker criar um alerta
 *
 * @type {number}
 */
let thinkerDebounceAttemptsToAlert;

/**
 * O tempo até acabar o pensamento atual
 *
 * @type {number}
 */
let thinkerTimeToFinish;

/**
 * O tempo até habilitar o próximo alerta
 *
 * @type {number}
 */
let thinkerLastAlert = 0;

// #endregion

// #region Initializer

/**
 * Método que inicializa as configurações do Thinker
 */
const initializeThinker = () => {
	thinkerBufferData = [];
	thinkerLastThinking = {
		isFirstProcess: true,
		measurementData: [],
		measurementMaxToAlert: 0,
	};
	thinkerDebounceAttemptsToAlert = 0;
	thinkerTimeToFinish = (+new Date()) + thinker.timePerThinking;
};

// #endregion

// #region Events

/**
 * Método que realiza o processo do Thinker
 *
 * @param {string} measurement O valor da medição
 * @return {void}
 */
const thinkerProcessMeasurement = (measurement) => {
	if ((+new Date()) > thinkerTimeToFinish)
		return thinkerFinalizeThinking();

	const measurementData = { value: +measurement, time: +new Date() };

	thinkerBufferData.push(measurementData);

	if (thinkerLastThinking.isFirstProcess)
		return;

	if (measurement < thinkerLastThinking.measurementMaxToAlert)
		return thinkerDebounceAttemptsToAlert = 0;

	thinkerDebounceAttemptsToAlert++;

	console.log('Debounce de um alerta tentativa numero: ' + thinkerDebounceAttemptsToAlert);

	if (thinkerDebounceAttemptsToAlert < thinker.debounceAttemptsToAlert)
		return;

	thinkerCreateAlert();
};

/**
 * Método que finaliza um pensamento
 */
const thinkerFinalizeThinking = () => {
	console.log('Finalizando um pensamento.');

	if (thinkerBufferData.length === 0)
		return;

	const listMeasurement = thinkerBufferData.map((mesurementData) => mesurementData.value);

	const media = listMeasurement.reduce((total, mesurement) => total + (mesurement / listMeasurement.length), 0);

	const measurementMaxToAlert = media + thinker.securityThreshold;

	thinkerLastThinking = {
		isFirstProcess: false,
		measurementData: thinkerBufferData,
		measurementMaxToAlert,
	};

	thinkerDebounceAttemptsToAlert = 0;
	thinkerBufferData = [];
	thinkerTimeToFinish = (+new Date()) + thinker.timePerThinking;

	saveThinkingToJson(thinkerLastThinking);
};

// #endregion

/**
 * Método que cria um alerta sobre a situação atual
 */
const thinkerCreateAlert = () => {
	thinkerDebounceAttemptsToAlert = 0;

	if ((+new Date()) <= thinkerLastAlert)
		return;

	thinkerLastAlert = thinkerTimeToFinish;

	console.log('Criando um alerta');

	if (thinkerBufferData.length === 0)
		return;

	const average = thinkerBufferData
		.map((mesurementData) => mesurementData.value)
		.reduce((total, value) => total + (value / thinkerBufferData.length), 0);

	const elevationAboveAverage = average - thinkerLastThinking.measurementMaxToAlert;

	const alertData = {
		elevationAboveAverage,
		type: 'danger',
		lastThinking: thinkerLastThinking,
		currentMeasurementData: thinkerBufferData,
		time: +new Date(),
	};

	saveAlertToJson(alertData);
};

// #endregion

// #region Writer

/**
 *	Método que salva os pensamentos para JSON
 *
 * @param {thinkingData} thinkingData
 */
const saveThinkingToJson = (thinkingData) => {
	delete thinkingData.isFirstProcess;

	const filename = `./thinking/thinking-${+new Date()}.json`;

	writeFile(filename, thinkingData, { spaces: 2 })
		.catch((error) => console.error(error));
};

/**
 *	Método que salva os alertas para JSON
 *
 * @param {alertData} alertData
 */
const saveAlertToJson = (alertData) => {
	const filename = `./alerts/alert-${alertData.type}-${+new Date()}.json`;

	writeFile(filename, alertData, { spaces: 2 })
		.catch((error) => console.error(error));
};

// #endregion

if (thinker.isDebug)
	fakeData();
else
	initializeOpenStream();
