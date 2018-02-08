export interface Update {
  $set: any;
  $setOnInsert: any;

  [k: string]: any;
}
