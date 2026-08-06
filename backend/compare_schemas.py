import os
import sqlalchemy as sa
from sqlalchemy.engine import create_engine
from sqlalchemy import inspect
import json

def get_schema(url):
    engine = create_engine(url)
    inspector = inspect(engine)
    schema = {}
    for table_name in inspector.get_table_names():
        columns = {}
        for col in inspector.get_columns(table_name):
            columns[col['name']] = str(col['type'])
        schema[table_name] = columns
    return schema

def compare_schemas(prod_url, test_url):
    print("Fetching Prod Schema...")
    prod_schema = get_schema(prod_url)
    
    print("Fetching Test Schema...")
    test_schema = get_schema(test_url)
    
    prod_tables = set(prod_schema.keys())
    test_tables = set(test_schema.keys())
    
    in_prod_not_test = prod_tables - test_tables
    in_test_not_prod = test_tables - prod_tables
    
    differences_found = False
    
    if in_prod_not_test:
        differences_found = True
        print(f"\n[!] Tables in PROD but missing in TEST: {', '.join(in_prod_not_test)}")
        
    if in_test_not_prod:
        differences_found = True
        print(f"\n[!] Tables in TEST but missing in PROD: {', '.join(in_test_not_prod)}")
        
    common_tables = prod_tables.intersection(test_tables)
    
    for table in common_tables:
        prod_cols = prod_schema[table]
        test_cols = test_schema[table]
        
        prod_col_names = set(prod_cols.keys())
        test_col_names = set(test_cols.keys())
        
        missing_in_test = prod_col_names - test_col_names
        missing_in_prod = test_col_names - prod_col_names
        
        if missing_in_test:
            differences_found = True
            print(f"\n[!] Table '{table}' -> Missing in TEST: {', '.join(missing_in_test)}")
        if missing_in_prod:
            differences_found = True
            print(f"\n[!] Table '{table}' -> Missing in PROD: {', '.join(missing_in_prod)}")
            
        common_cols = prod_col_names.intersection(test_col_names)
        for col in common_cols:
            if prod_cols[col] != test_cols[col]:
                differences_found = True
                print(f"\n[!] Table '{table}', Column '{col}' type mismatch:")
                print(f"    PROD: {prod_cols[col]}")
                print(f"    TEST: {test_cols[col]}")
                
    if not differences_found:
        print("\n✅ SUCCESS: Prod and Test databases are perfectly in sync!")

if __name__ == "__main__":
    from dotenv import dotenv_values
    
    prod_env = dotenv_values(".env.prod")
    test_env = dotenv_values(".env")
    
    prod_url = prod_env.get("DATABASE_URL")
    test_url = test_env.get("DATABASE_URL")
    
    compare_schemas(prod_url, test_url)
