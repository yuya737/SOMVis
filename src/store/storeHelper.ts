import API from "@/api/api";
import {
  dataset_name,
  sspAllLabels,
  subsetType,
  timeType,
  timeTypeMonths,
} from "@/components/utils/utils";

const timeTypes = [timeType.OctMay];

async function getVectorFieldData(setting) {
  // [dataset_Type, model_type, time_type, data_type_cmp, month]
  let vectorFieldData: PartialRecord<timeType, any> = {};
  try {
    let temp = await API.fetchData("get_forcing", true, {
      dataset_type: setting[0],
      model_type: setting[1],
      time_type: setting[2],
      data_type_cmp: setting[3],
      month: setting[4],
      resolution: 10,
    });
    vectorFieldData[setting[2]] = temp;
  } catch (error) {
    vectorFieldData[setting[2]] = null;
  }
  return vectorFieldData;
}

async function getPaths() {
  let pathData: PartialRecord<timeType, Record<string, BMUData[]>> = {};

  let paths = {} as PartialRecord<string, BMUData[]>;
  const gigaPromise = timeTypes.map(async (curTimeType) => {
    const pathPromises = sspAllLabels.map(async (d, i) => {
      let data: SOMPath = await API.fetchData("path", true, {
        dataset_type: dataset_name,
        time_type: curTimeType,
        model_type: d.model_name,
        data_type: d.ssp,
        // umap: true,
      });
      const resolveMonth = (index) => {
        if (curTimeType == timeType.All) return (index % 12) + 1;
        if (curTimeType == timeType.AprSep) return (index % 6) + 4;
        if (curTimeType == timeType.OctMar) {
          let temp = [1, 2, 3, 10, 11, 12];
          return temp[index % 6];
        }
        if (curTimeType == timeType.OctMay) {
          let temp = [1, 2, 3, 4, 5, 10, 11, 12];
          return temp[index % 8];
        }
        throw "error in resolveMonth";
      };
      const resolveYear = (index) => {
        if (curTimeType == timeType.All) return Math.floor(index / 12);
        if (curTimeType == timeType.AprSep) return Math.floor(index / 6);
        if (curTimeType == timeType.OctMar) return Math.floor(index / 6);
        if (curTimeType == timeType.OctMay) return Math.floor(index / 8);
        throw "error in resolveYear";
      };
      paths[`${d.model_name}:${d.ssp}:${d.variant}`] = data.map((id, index) => {
        return {
          // id: key,
          name: d.model_name,
          // year: Math.floor(index / 12),
          year: resolveYear(index),
          // month: (index % 12) + 1,
          month: resolveMonth(index),
          id: id,
          // coords: [map[id].coords[0], -map[id].coords[1]],
        };
      });
    });
    pathData[curTimeType] = paths;
    await Promise.all(pathPromises);
  });
  return pathData;
}

async function getNodeData(anchors = null) {
  let mappingData: PartialRecord<timeType, SOMNode[]> = {};
  let classifyData: PartialRecord<timeType, { value: number }> = {};
  let contourData: PartialRecord<timeType, any> = {};
  let interpolatedSurfaceData: PartialRecord<timeType, any> = {};
  let hotspotPolygonsData: PartialRecord<timeType, any> = {};
  let vectorFieldData: PartialRecord<timeType, any> = {};

  if (anchors) {
    // anchors.coords = anchors.coords.map((d) => [d[0] / 3, d[1] / 3]);
    anchors.coords = anchors.coords.map((d) => [d[0] / 10, d[1] / 10]);
  }

  const gigaPromise = timeTypes.map(async (curTimeType) => {
    let map = await API.fetchData("mapping", true, {
      dataset_type: dataset_name,
      time_type: curTimeType,
      anchors: anchors,
    });
    // map = map.map((d) => {
    //   return {
    //     ...d,
    //     coords: [d.coords[0], -d.coords[1]],
    //   };
    // });
    mappingData[curTimeType] = map;

    let xMin = Math.min(...map.map((d) => d.coords[0]));
    let xMax = Math.max(...map.map((d) => d.coords[0]));
    let yMin = Math.min(...map.map((d) => d.coords[1]));
    let yMax = Math.max(...map.map((d) => d.coords[1]));

    let classify = await API.fetchData("node_means", true, {
      dataset_type: dataset_name,
      time_type: curTimeType,
    });

    classifyData[curTimeType] = classify;

    let data = map.map((d) => {
      return { ...d, value: classify[d.id].value };
    });

    const contour = await API.fetchData("contours", true, { data: data });
    contourData[curTimeType] = contour;

    vectorFieldData[curTimeType] = null;

    const { interpolatedSurface, resolution, x, y } = await API.fetchData(
      "interpolatedSurface",
      true,
      {
        data: data,
      }
    );
    interpolatedSurfaceData[curTimeType] = {
      interpolatedSurface,
      resolution,
      x,
      y,
    };

    let hotspotPolygons = {};

    // const hotspotPromises = timeTypeMonths[curTimeType].map(async (month) => {
    //   let data = await API.fetchData("get_smoothed_alpha", true, {
    //     dataset_type: dataset_name,
    //     time_type: curTimeType,
    //     members: sspAllLabels,
    //     years: [-1],
    //     months: [month],
    //     kde_bounds: [xMin, xMax, yMin, yMax],
    //   });
    //   hotspotPolygons[month] = data;
    // });
    hotspotPolygonsData[curTimeType] = hotspotPolygons;

    // await Promise.all(hotspotPromises);
    console.log("DEBUG DONE HOTSPOT PROMISES");
  });
  await Promise.all(gigaPromise);

  console.log("DEBUG DONE STORE MAIN");
  return {
    nodeMap: mappingData,
    classifyData: classifyData,
    hotspotPolygons: hotspotPolygonsData,
    contourData: contourData,
    interpolatedSurfaceData: interpolatedSurfaceData,
    vectorFieldData: vectorFieldData,
  };
}

export { getVectorFieldData, getPaths, getNodeData };
