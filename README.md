# mongoose-transform-field-plugin

An automatic field transformation plugin for Mongoose 5. Any transformations are registered as `save`, `update` and `findOneAndUpdate` middleware.

[![NPM link](https://nodei.co/npm/mongoose-transform-field-plugin.svg?compact=true)](https://www.npmjs.com/package/mongoose-transform-field-plugin)

[![Build Status](https://travis-ci.org/Alorel/mongoose-transform-field-plugin.svg?branch=master)](https://travis-ci.org/Alorel/mongoose-transform-field-plugin)
[![Coverage Status](https://coveralls.io/repos/github/Alorel/mongoose-transform-field-plugin/badge.svg?branch=master)](https://coveralls.io/github/Alorel/mongoose-transform-field-plugin?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/Alorel/mongoose-transform-field-plugin.svg)](https://greenkeeper.io/)
![Supports Node >= 6](https://img.shields.io/badge/Node-%3E=6.0.0-brightgreen.svg)
![Supports Mongoose >= 5.0](https://img.shields.io/badge/Mongoose-%3E=5.0.0-brightgreen.svg)

-----

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Asynchronous transformation](#asynchronous-transformation)
  - [Direct usage](#direct-usage)
  - [Schema plugin usage](#schema-plugin-usage)
- [Normalisation](#normalisation)
- [Synchronous Transformations](#synchronous-transformations)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Asynchronous transformation

## Direct usage

```typescript
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import {AsyncTransform, MongooseTransformFieldPlugin} from 'mongoose-transform-field-plugin';

const schema = new mongoose.Schema({
  password: String
});

const transformer: AsyncTransform<string> = (pwd: string): Promise<string> => {
  return bcrypt.hash(pwd, 12);
};

// Run as non-parallel Mongoose middleware by default
MongooseTransformFieldPlugin.transformAsync(schema, 'password', transformer);

// Run as non-parallel Mongoose middleware explicitly
MongooseTransformFieldPlugin.transformAsync(schema, 'password', false, transformer);

// Run as a parallel Mongoose middleware
MongooseTransformFieldPlugin.transformAsync(schema, 'password', true, transformer);
```

## Schema plugin usage

```typescript
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import {AsyncTransform, MongooseTransformFieldPlugin, TransformAsyncOptions} from 'mongoose-transform-field-plugin';

const schema = new mongoose.Schema({
  password: String
});

const transform: AsyncTransform<string> = (pwd: string): Promise<string> => {
  return bcrypt.hash(pwd, 12);
};

// Run as non-parallel Mongoose middleware by default
let config: TransformAsyncOptions<string> = {
  field: 'password',
  transformer: transform
};
schema.plugin(MongooseTransformFieldPlugin.transformAsync.plugin, config);

// Run as non-parallel Mongoose middleware explicitly
config = {
  field: 'password',
  parallel: false,
  transformer: transform
};
schema.plugin(MongooseTransformFieldPlugin.transformAsync.plugin, config);

// Run as a parallel Mongoose middleware
config = {
  field: 'password',
  parallel: true,
  transformer: transform
};
schema.plugin(MongooseTransformFieldPlugin.transformAsync.plugin, config);
```

# Normalisation

This transforms accented characters from a string, trims it and makes it lowercase before storing it in another field.
Useful if you want some basic search functionality.

```typescript
import * as mongoose from 'mongoose';
import {MongooseTransformFieldPlugin} from 'mongoose-transform-field-plugin';

const schema = new mongoose.Schema({
  firstname: String,
  firstname_normalised: {
    select: false,
    type: String
  },
  lastname: String,
  lastname_normalised: {
    select: false,
    type: String
  }
});

const fields = {
  firstname: 'firstname_normalised', // firstname will be normalised into the firstname_normalised field
  lastname: 'lastname_normalised' // lastname will be normalised into the lastname_normalised field
};

// Direct usage
MongooseTransformFieldPlugin.normalise(schema, fields);

// Plugin usage
schema.plugin(MongooseTransformFieldPlugin.normalise.plugin, fields);
```

# Synchronous Transformations

You should really use schema setters instead, but this is included for completeness' sake.

```typescript
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import {MongooseTransformFieldPlugin, SyncTransform, TransformSyncOptions} from 'mongoose-transform-field-plugin';

const schema = new mongoose.Schema({
  password: String
});

const transform: SyncTransform<string> = (pwd: string): string => {
  return bcrypt.hashSync(pwd, 12);
};

// Direct usage
MongooseTransformFieldPlugin.transformSync(schema, 'password', transform);

// Plugin usage
const conf: TransformSyncOptions<string> = {
  field: 'password',
  transformer: transform
};

schema.plugin(MongooseTransformFieldPlugin.transformSync.plugin, conf);
```