#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {getConfig} from "../config";
import {TheApp} from "../lib/theApp";

const app = new cdk.App();
const config = getConfig(app);

new TheApp(app, `app-stack-${config.environment}`, {
    environment: config.environment,
    config: config
});