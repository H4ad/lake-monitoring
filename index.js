// #region Imports

import { SerialPort, parsers } from 'serialport';

// #endregion

// #region Const Properties

/**
 * A classe que lida com a leitura de dados serial
 */
const port = new SerialPort('/dev/ttyACM0', {
  baudrate: 9600,
  parser: parsers.readline('\n'),
});

// #endregion

// #region Methods

/**
 * Método que abre a conexão com a porta serial
 */
const initializeOpenStream = () => {
  port.on('open', onOpenStream);
};

/**
 * Método executado após abrir a conexão com a porta serial
 */
const onOpenStream = () => {
  initializeReadDataStream();
};

/**
 * Método que inicializa a leitura dos dados serial enviados pela placa
 */
const initializeReadDataStream = () => {
  port.on('data', onReadDataStream);
};

/**
 * Método que recebe o valor da leitura do potênciometro
 *
 * @param {string} potentiometerPower A potência atual do potênciometro
 */
const onReadDataStream = (potentiometerPower) => {
  console.log(potentiometerPower);
};

// #endregion

initializeOpenStream();
