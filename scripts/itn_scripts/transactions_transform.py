import pandas as pd
import numpy as np
import json
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
# Create a GlueContext
glueContext = GlueContext(SparkContext.getOrCreate())

# Initialize the Job class with the glue_context argument
job = Job(glueContext)
# Define batch size for reading and processing
batch_size = 1000000
l=0 #writing length
base_path = 's3://shardeumdb/liberty_v2/'
subfolders =['liberty1.0Refresh2/']#['liberty1.1/','liberty2.0/']#,'liberty1.0Refresh/'] #,'liberty1.1/','liberty2.0/'] #['liberty1.1Refresh/','liberty1.2/','liberty1.3-explorer/','liberty1.4-explorer/','liberty1.5-explorer/','liberty1.6-explorer/','liberty2.0-explorer/']    #['dapp1.5.6-explorer/']#['dapp1.6.1-explorer/','dapp1.7.1-explorer/'] #['beta1.2-explorer/','beta1.3.0-explorer/','beta1.4-explorer/','sphinx1.0-explorer/','sphnix2.0-explorer/','sphnix3.0-explorer/','beta1.5.6-13-09-23/','beta1.6.1-explorer/']#['beta1.6.1-explorer/','beta1.7.2-explorer/','beta1.8.0-explorer/','beta1.9.3-explorer/','beta1.9.7_26Feb24/'] # ['beta1.5.6-13-09-23/','dapp1.5.6-explorer/'] #,'dapp1.6.1-explorer/','sphinx1.0-explorer/'
filename = ['transactions.csv']#,'transactions.csv'] #,'transactions.csv','transactions.csv']#['transactions.csv','transactions.csv','transactions.csv','transactions.csv','transactions.csv','transactions.csv','transactions.csv'] #['transactions_dapp1p5p6_explorer.csv']#['transactions_dapp1p6p1_explorer.csv','transactions_dapp1p7p1_explorer.csv'] #['transactions_beta1p2_explorer.csv','transactions_beta1p3p0_explorer.csv','transactions_beta1p4_explorer.csv','transactions_beta1p0_explorer.csv','transactions_sphinx2p0_explorer.csv','transactions_sphinx3p0_explorer.csv','transactions_beta1p5p6_explorer.csv','transactions_beta1p6p1_explorer.csv'] #['transactions_beta1p6p1_explorer.csv','transactions_beta1p7p2_explorer.csv','transactions1p8p0explorer.csv','transactions_beta1.9.3-explorer.csv','transactions_beta1p9p7_explorer_26thFeb.csv']#['transactions_beta1p5p6_explorer.csv','transactions_dapp1p5p6_explorer.csv'] #,'transactions_dapp1p6p1_explorer.csv','transactions_beta1p0_explorer.csv']
def receipts(comp_val):
    df[comp_val] = df.apply(lambda x: json.loads(x['wrappedEVMAccount']).get('readableReceipt', {}).get(comp_val) if comp_val in json.loads(x['wrappedEVMAccount']).get('readableReceipt', {}) and 'readableReceipt' in json.loads(x['wrappedEVMAccount']) else None, axis=1)
    return df[comp_val]

comp = ['contractAddress','data','from','logs','nonce','status','to','transactionHash','value','isInternalTx','internalTx','stakeInfo']

def wrappedEVM(comp_val):
    df[comp_val] = df.apply(lambda x: json.loads(x['wrappedEVMAccount']).get(comp_val, {}) if comp_val in json.loads(x['wrappedEVMAccount']) else None, axis=1)
    return df[comp_val]

compl1 = ['accountType','amountSpent','ethAddress','txId','hash']

def stakeinfo(comp_val):
    df[comp_val] = df.apply(lambda x: json.loads(x['wrappedEVMAccount']).get('readableReceipt', {}).get('stakeInfo', {}).get(comp_val) if 'wrappedEVMAccount' in x else None, axis=1)
    return df[comp_val]

stake = ['nominee','penalty','reward','stake','totalUnstakeAmount','totalStakeAmount']

def hex_to_decimal(hex_value):
    return int(hex_value, 16)

def extract_readable_receipt(row):
    wrappedEVMAccount = json.loads(row['wrappedEVMAccount'])
    if 'readableReceipt' in wrappedEVMAccount:
        return wrappedEVMAccount['readableReceipt']
    else:
        return {}
def extract_component(row, component):
    readable_receipt = row['readable_receipt']
    if component in readable_receipt:
        return readable_receipt[component]
    else:
        return None
def extract_stake_component(row, component):
    stakeInfo = row.get('stakeInfo')  # Using get method to handle NoneType
    if stakeInfo is not None:  # Check if stakeInfo is not None
        if component in stakeInfo:
            return stakeInfo[component]
    return None  # Return None or handle the case where component is not found
for subfolder,file in zip(subfolders,filename):
    # Read the large CSV file in batches
    reader = pd.read_csv(f"{base_path}{subfolder}{file}", chunksize=batch_size)
    
    l=0 #rewriting length

    for i, chunk in enumerate(reader):# Process and write each batch
        
        print(f"Reading batches started {subfolder} batch {i+1} ")
        # Perform data processing operations on the chunk
        df = pd.DataFrame(chunk)
        
        print(f"Reading batches completed {subfolder} {i+1} batch size {len(df)} ")

        df['readable_receipt'] = df.apply(extract_readable_receipt, axis=1)
        
        for component in comp:
            df[component] = df.apply(lambda row: extract_component(row, component), axis=1)

        for compevm in compl1:
            globals()['df'][compevm] = wrappedEVM(compevm)
            
        print(f"wrappedevm extraction done for batch {i+1} for version {subfolder}")    

        df['value_decimal']=df['value'].apply(hex_to_decimal)/(10**18)
        
        print(f"txn amount conversion done for batch {i+1} for version {subfolder}")

        df['amountSpent_decimal']=df['amountSpent'] #.apply(hex_to_decimal)/(10**18)

        for stakeitr in stake:
            df[stakeitr] = df.apply(lambda row: extract_stake_component(row, stakeitr), axis=1)
            
        df = df.drop(['wrappedEVMAccount','readable_receipt','stakeInfo','logs','originTxData'], axis=1)
        
        df['data'] = df['data'].str.slice(0, 65534)
        
        print(f"Writing batches started {subfolder} batch {i+1} batch size {len(df)}")
        
        df.to_csv(f"{base_path}{subfolder}transactions_split/transactions_transformed_split_v{i+1}.csv", index=False)

        l+=len(df)

        print(f"Writing batches completed {subfolder} {i+1} batch size {len(df)} Total rows {l}")
# %stop_session
#         if i == 0:    
#             df.to_csv(f"{base_path}{subfolder}_transformed_v1.csv", index=False)
        
#         if i >= 1:  # Corrected from i == 1 # For the second batch of writing (appending to an existing file)
#             df.to_csv(f"{base_path}{subfolder}transactions_split/transactions_transformed_split_v{i}.csv", mode='a', header=False, index=False)  # Append without header
                
job.commit()