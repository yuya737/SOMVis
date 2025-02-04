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
    try {
      // Make the network request
      const resp = await fetch(URL, init);

      // Check if the response is not OK (status outside of the range 200-299)
      if (!resp.ok) {
        const errorText = await resp.text(); // Extract error message from response
        throw new Error(
          `HTTP error: ${resp.status} - ${errorText || "No additional details"}`
        );
      }

      // Parse the JSON response if needed
      if (isjson) {
        return await resp.json();
      }

      // Return response for non-JSON cases
      return resp;
    } catch (error) {
      // Catch network errors or any other unexpected errors
      console.error("Fetch error:", error);

      // Optionally, you can re-throw the error to handle it in the calling code
      throw new Error(`Failed to fetch data from ${URL}: ${error}`);
    }

    // let resp = await fetch(URL, init);

    // if (!resp.ok) {
    //   throw new Error(`HTTP error:${resp.status}`);
    // }

    // if (isjson) {
    //   resp = await resp.json();
    // }

    // return resp;
  }
}

export default new API();
