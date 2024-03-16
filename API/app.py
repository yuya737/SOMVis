# import a module from another directory
import os
import re
import sys

sys.path.append("/Users/yuyakawakami/Research/EOF_ensemble")

import calculate_eof as ce
import calculate_projections as cp
import numpy as np
import pandas as pd
import xarray as xr
from flask import Flask, jsonify, make_response, request
from flask_caching import Cache
from flask_cors import CORS

config = {
    "DEBUG": True,  # some Flask specific configs'
    "CACHE_TYPE": "simple",  # Flask-Caching related configs
}

app = Flask(__name__)
app.config.from_mapping(config)
CORS(app)
cache = Cache(app)


def make_key():
    """A function which is called to derive the key for a computed value.
       The key in this case is the concat value of all the json request
       parameters. Other strategy could to use any hashing function.
    :returns: unique string for which the value should be cached.
    """
    user_data = request.get_json()
    return ",".join([f"{key}={value}" for key, value in user_data.items()])


@app.route("/", methods=["GET"])
def index():
    """
    Return Hello World
    """
    return "Hello World"


@app.route("/random", methods=["GET"])
def random():
    """
    Return random points
    """
    # generate 100 random points inside a 50x50 square as floats
    x = np.random.uniform(-25, 25, 100)
    y = np.random.uniform(-25, 25, 100)

    # make a list of lists

    res_data = {
        "points": [
            {"coords": list(pair), "text": "random points"} for pair in zip(x, y)
        ]
    }
    return make_response(jsonify(res_data), 200)


@app.route("/spatial_CMIP6", methods=["POST"])
# @cache.cached(timeout=None, make_cache_key=make_key)
def spatial_CMIP6():
    """
    testing for now
    """

    request_payload = request.get_json()

    # generate 100 random points inside a 50x50 square as floats
    df = cp.calculate_projection(
        request_payload["file"],
        request_payload["filter_string"],
        request_payload["temporal"],
        request_payload["three_d"],
        lat=None,
    )
    cache_file_name = f"{os.path.basename(request_payload['file']).split('.')[0]}_{'temporal' if request_payload['temporal']  else 'spatial'}_projections"
    df.to_csv(cache_file_name + ".csv")

    print(
        f"xmin: {np.min(df['Dimension 1'])}, xmax: {np.max(df['Dimension 1'])}, ymin: {np.min(df['Dimension 2'])}, ymax: {np.max(df['Dimension 2'])}"
    )

    res_data = {
        "points": [
            {
                "coords": [
                    float(row["Dimension 1"]),
                    float(row["Dimension 2"]),
                    float(row["Dimension 3"]),
                ],
                "text": index,
            }
            if request_payload["three_d"]
            else {
                "coords": [float(row["Dimension 1"]), float(row["Dimension 2"])],
                "text": index,
            }
            for index, row in df.iterrows()
        ]
    }

    return make_response(jsonify(res_data), 200)


@app.route("/spatial_MPI", methods=["POST"])
# @cache.cached(timeout=None, make_cache_key=make_key)
def spatial_MPI():
    """
    testing for now
    """

    request_payload = request.get_json()

    _, _, lat, _ = ce.read_data(
        "/Users/yuyakawakami/Research/Data/MPI-GE/ncs/ts_Lmon_MPI-ESM_rcp26_r001i2005p3_200601-209912.nc",
        "ts",
        nc_selector=None,
        remove_mean=False,
        linear_detrend=False,
    )
    print("lat", lat)

    # generate 100 random points inside a 50x50 square as floats
    df = cp.calculate_projection(
        request_payload["file"],
        request_payload["filter_string"],
        request_payload["temporal"],
        request_payload["three_d"],
        lat=lat,
    )
    cache_file_name = f"{os.path.basename(request_payload['file']).split('.')[0]}_{'temporal' if request_payload['temporal']  else 'spatial'}_projections"
    df.to_csv(cache_file_name + ".csv")

    print(
        f"xmin: {np.min(df['Dimension 1'])}, xmax: {np.max(df['Dimension 1'])}, ymin: {np.min(df['Dimension 2'])}, ymax: {np.max(df['Dimension 2'])}"
    )

    pattern = r"_rcp(\d{2})_r(\d{3})i.*D(\d+)"

    res_data = {
        "points": [
            {
                "coords": [
                    float(row["Dimension 1"]),
                    float(row["Dimension 2"]),
                    float(row["Dimension 3"]),
                ],
                "text": index,
            }
            if request_payload["three_d"]
            else {
                "coords": [float(row["Dimension 1"]), float(row["Dimension 2"])],
                "text": index,
            }
            for index, row in df.iterrows()
        ]
    }

    for point in res_data["points"]:
        print(point["text"])
        match = re.search(pattern, point["text"])
        if match:
            rcp_substring = match.group(1)
            ensembleid_substring = match.group(2)
            decade_id = match.group(3)
            point["text"] = f"RCP{rcp_substring}:E{ensembleid_substring}:D{decade_id}"
        else:
            print("Pattern not found.")

    return make_response(jsonify(res_data), 200)


@app.route("/spatial_data", methods=["POST"])
def temporal():
    """
    testing for now
    """

    request_payload = request.get_json()
    file_name, name = (
        request_payload["file_name"],
        request_payload["name"],
    )

    df = pd.read_csv(file_name)

    arr = {"data": df.filter(like=name).replace(np.nan, None).values.flatten().tolist()}

    return make_response(jsonify(arr, 200))


@app.route("/spatial_grid", methods=["POST"])
def spatial_grid():

    request_payload = request.get_json()
    data_type = request_payload["data_type"]
    if data_type == "MPI":
        _, _, lat, lon = ce.read_data(
            "/Users/yuyakawakami/Research/Data/MPI-GE/ncs/ts_Lmon_MPI-ESM_rcp26_r001i2005p3_200601-209912.nc",
            "ts",
            nc_selector=None,
            remove_mean=False,
            linear_detrend=False,
        )

        ret = {
            "lat": lat.data.tolist(),
            "lon": [(float(i) + 180) % 360 - 180 for i in lon.data.tolist()],
        }
    elif data_type == "LOCA":
        dat = xr.open_dataset("/Users/yuyakawakami/Research/Data/CMIP6/LOCA.nc")

        ret = {
            "lat": dat.lat.data.tolist(),
            "lon": dat.lon.data.tolist(),
        }

    else:

        _, _, lat, lon = ce.read_data(
            "/Users/yuyakawakami/Research/Data/CMIP6/air_temp_2m.nc",
            "Air Temperature at 2m",
            nc_selector=None,
            remove_mean=False,
            linear_detrend=False,
        )
        ret = {
            "lat": lat.flatten().data.tolist(),
            "lon": lon.flatten().data.tolist(),
        }

    return make_response(jsonify(ret), 200)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
