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
subfolders = ['liberty2.0/', 'liberty1.1Refresh/','liberty1.2/','liberty1.3-explorer/','liberty1.4-explorer/','liberty1.5-explorer/','liberty1.6-explorer/','liberty2.0-explorer/', 'liberty2.1-explorer/']
filename = 'accounts.csv'
def exclude_components(json_data):
    try:
        data = json.loads(json_data)
        
        def remove_keys(d):
            if isinstance(d, dict):
                return {k: remove_keys(v) for k, v in d.items() if k not in ['codeHash', 'codeByte', 'storageRoot']}
            elif isinstance(d, list):
                return [remove_keys(item) for item in d]
            else:
                return d
        
        updated_data = remove_keys(data)
        return json.dumps(updated_data)
    except json.JSONDecodeError:
        return json_data
for subfolder in subfolders:
    # Read the large CSV file in batches
    print(f"Reading csv file {subfolder}{filename}")
    
    reader = pd.read_csv(f"{base_path}{subfolder}{filename}", chunksize=batch_size)
    
    l=0 #rewriting length

    for i, chunk in enumerate(reader):# Process and write each batch
        
        print(f"Reading batches started {subfolder} batch {i+1} ")
        # Perform data processing operations on the chunk
        df = pd.DataFrame(chunk)
        
        print(f"Reading batches completed {subfolder} {i+1} batch size {len(df)} ")

        df['account'] = df['account'].apply(exclude_components)
        
        print(f"Writing batches started {subfolder} batch {i+1} batch size {len(df)}")
        
        df.to_csv(f"{base_path}{subfolder}accounts_transformed/accounts_split_v{i+1}.csv", index=False)

        l+=len(df)

        print(f"Writing batches completed {subfolder} {i+1} batch size {len(df)} Total rows {l}")
job.commit()