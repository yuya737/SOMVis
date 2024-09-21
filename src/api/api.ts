/* eslint-disable class-methods-use-this */
const API_URL = "http://0.0.0.0:5002";

class API {
  requestData(header, params) {
    return this.fetchData(header, params);
  }

  async fetchData(type, isjson, params): Promise<any> {
    let URL = `${API_URL}/${type}`;

    let init = {
      method: "GET",
      headers: {
        "Access-Control-Allow-Origin": "*",
        // 'Content-Type': 'application/json'
      },
    };
    if (params) {
      init = {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      };
    }

    let resp = await fetch(URL, init);

    if (!resp.ok) {
      throw new Error(`HTTP error:${resp.status}`);
    }

    if (isjson) {
      resp = await resp.json();
    }

    return resp;
  }
}

export default new API();
