import time
from flask import Flask
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}


@app.route('/api/dbquery')
def db_query():
    return {'message': "HELLO WORLD",
            'data': [1,2,3,4,5]
            }