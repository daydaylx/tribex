export class Effect {
  constructor(context) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }
}
