import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
import pandas as pd
import json
import numpy as np

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

base_path = 's3://shardeumdb/'

subfolders = ['beta1.9.3-explorer/','beta1.9.7_26Feb24/','dapp1.5.6-explorer/','dapp1.6.1-explorer/','dapp1.7.1-explorer/','sphinx1.0-explorer/','sphnix2.0-explorer/','sphnix3.0-explorer/','beta1.10.3/']  


for subfolder in subfolders:
    # Read the CSV file from S3
    df = pd.read_csv(f"{base_path}{subfolder}cycles.csv")
    
    df['timestamp_epoch'] = df.apply(lambda x: json.loads(x['cycleRecord'])['start'], axis=1)
    
    # Function to process events
    def process_event(df, event_name):
        df[event_name] = df.apply(lambda x: json.loads(x['cycleRecord']).get(event_name) if event_name in json.loads(x['cycleRecord']) else None, axis=1)
        event_df = df[df[event_name].str.len() > 0]
        event_df.insert(0, 'eventname', event_name)
        event_df.insert(4, 'publickey', np.nan)
        event_df = event_df.explode(event_name)
        event_df.rename(columns={event_name: 'id'}, inplace=True)
        df = df.drop(event_name, axis=1)
        event_df = event_df[['eventname','cycleMarker', 'counter','timestamp_epoch','publickey','id']]
        return df, event_df
    
    # List of events to process
    events = ['startedSyncing', 'finishedSyncing', 'activated', 'removed', 'apoptosized']
    
    # Process each event
    for event in events:
        df, globals()['df_' + event] = process_event(df, event)
    
    # standbyAdd
    df['standbyAdd'] = df.apply(lambda x: json.loads(x['cycleRecord']).get('standbyAdd') if 'standbyAdd' in json.loads(x['cycleRecord']) else None, axis=1)
    df_standbyAdd= df[df.standbyAdd.str.len()>0]
    df_standbyAdd.insert(0, 'eventname', 'standbyAdd')
    df_standbyAdd= df_standbyAdd.explode('standbyAdd')
    df_standbyAdd['publickey'] = df_standbyAdd['standbyAdd'].apply(lambda x: x.get('nodeInfo', {}).get('publicKey'))
    df_standbyAdd['externalIp'] = df_standbyAdd['standbyAdd'].apply(lambda x: x.get('nodeInfo', {}).get('externalIp'))
    df_standbyAdd['externalPort'] = df_standbyAdd['standbyAdd'].apply(lambda x: x.get('nodeInfo', {}).get('externalPort'))
    df = df.drop('standbyAdd', axis=1)
    df_standbyAdd.insert(6, 'id', np.nan)
    df_standbyAdd = df_standbyAdd[['eventname','cycleMarker', 'counter','timestamp_epoch','publickey','id','externalIp','externalPort']]
    
    def process_event_pub(df, event_name):
        df[event_name] = df.apply(lambda x: json.loads(x['cycleRecord']).get(event_name) if event_name in json.loads(x['cycleRecord']) else None, axis=1)
        event_df = df[df[event_name].str.len() > 0]
        event_df.insert(0, 'eventname', event_name)
        event_df = event_df.explode(event_name)    
        event_df.rename(columns={event_name: 'publickey'}, inplace=True)
        event_df.insert(5, 'id', np.nan)
        df = df.drop(event_name, axis=1)
        event_df = event_df[['eventname','cycleMarker', 'counter','timestamp_epoch','publickey','id']]
        return df, event_df
    
    # List of events to process
    events = ['standbyRefresh','standbyRemove']
    
    # Process each event
    for event in events:
        df, globals()['df_' + event] = process_event_pub(df, event)
    
    # joinedConsensors
    df['joinedConsensors'] = df.apply(lambda x: json.loads(x['cycleRecord']).get('joinedConsensors') if 'joinedConsensors' in json.loads(x['cycleRecord']) else None, axis=1)
    df_joinedConsensors= df[df.joinedConsensors.str.len()>0]
    df_joinedConsensors.insert(0, 'eventname', 'joinedConsensors')
    df_joinedConsensors= df_joinedConsensors.explode('joinedConsensors')
    df_joinedConsensors['publickey'] = df_joinedConsensors['joinedConsensors'].apply(lambda x: x.get('publicKey'))
    df_joinedConsensors['id'] = df_joinedConsensors['joinedConsensors'].apply(lambda x: x.get('id'))
    df = df.drop('joinedConsensors', axis=1)
    df_joinedConsensors = df_joinedConsensors[['eventname','cycleMarker', 'counter','timestamp_epoch','publickey','id']]
    
    df_transformed = pd.concat([df_standbyAdd,df_standbyRefresh,df_joinedConsensors,df_startedSyncing,df_finishedSyncing, df_activated, df_removed, df_apoptosized,df_standbyRemove], ignore_index=True)
    
    # Write the transformed data to a s3 file
    df_transformed.to_csv(f"{base_path}{subfolder}cycles_transformed.csv", index=False, header=True)

job.commit()