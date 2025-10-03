declare module 'tronweb' {
  interface TronWebInstance {
    contract(): any;
    trx: any;
    utils: any;
    address: any;
    fromSun(value: any): string;
    defaultAddress: any;
  }

  interface TronWebConstructor {
    new (options: {
      fullHost: string;
      privateKey?: string;
    }): TronWebInstance;
  }

  const TronWeb: TronWebConstructor;
  export default TronWeb;
}
