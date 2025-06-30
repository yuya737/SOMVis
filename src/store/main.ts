import { defineStore } from "pinia";
import API from "@/API/api";
import {
  dataset_name,
  sspAllLabels,
  subsetType,
  timeType,
  timeTypeMonths,
} from "@/components/utils/utils";
import { reactive } from "vue";
import { getVectorFieldData, getPaths, getNodeData } from "./storeHelper";

// const timeTypes = [timeType.AprSep, timeType.OctMar];
// const timeTypes = [timeType.OctMay];
// const timeTypes = [timeType.OctMar];
const timeTypes = [timeType.All];

export const useStore = defineStore("main", {
  // other options...
  state: () => {
    const state = reactive({
      files: [[], []] as [EnsembleMember[], EnsembleMember[]], // Assume this is a list of two lists of files that we want to compare, for now
      monthsSelected: [10], // -1 means all months
      subsetType: subsetType.month,
      // subsetType: "month",
      yearsSelected: [-1], // -1 means all years
      hoveredFile: null,
      clusterOrders: {},

      mapEditFlag: false, // Will flip when new MDE is calculated
      anchors: { ids: [], coords: [] },

      nodeMap: null as PartialRecord<timeType, SOMNode[]>,
      classifyData: null as PartialRecord<timeType, any>,
      pathData: null as PartialRecord<timeType, Record<string, BMUData[]>>,
      hotspotPolygons: null as PartialRecord<timeType, any>,
      contourData: null as PartialRecord<timeType, any>,
      interpolatedSurfaceData: null as PartialRecord<timeType, any>,
      vectorFieldData: null as PartialRecord<timeType, any>,
      vectorFieldSetting: [
        null as string,
        null as string,
        null as timeType,
        [] as string[],
        [] as number[],
      ],
      // [dataset_Type, model_type, time_type, data_type_cmp, month]

      redrawFlag: false,
      explainablityPoints: null as [Coords, Coords], // start and end point

      mapMode: "Explore" as MapMode,
      mapAnnotation: {
        type: "FeatureCollection",
        features: [] as { properties: {}; geometry: [] }[],
      },
      showMapAnnotationPopup: false,
      mapAnnotationPopup: {
        index: -1,
        coords: [0, 0],
      },
      highlightedNodes: [],
      LLMQueries: [] as LLMQueryResult[],
      chatBotHistory: [] as {
        type: string;
        typeDetail?: string;
        zoneID?: number;
        text: string | Promise<string>;
      }[],
      contourLevels: [0.25, 0.5, 0.75] as number[],
      nodeClickedID: -1 as number,
      currentStep: "Anchor" as step,
      // currentDatasetType: "California" as datasetType,
      currentDatasetType: "NorthWest" as datasetType,
      // currentDatasetType: "WestCoast" as datasetType,

      recalculateMDEFlag: false,
      isHidingDistribution: false,
      isHidingAnnotations: false,

      nodeMapCanvas: null,

      isShowingLLMQueriedRegion: true,
      LLMQueriedRegionIndex: -1,

      isShowingForcingClustering: false,

      LLMSummaryIntervals: null,
    });
    getNodeData({ dataset_name: state.currentDatasetType }).then((data) => {
      const {
        nodeMap,
        classifyData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
        vectorFieldData,
      } = data;
      state.nodeMap = nodeMap;
      state.classifyData = classifyData;
      state.hotspotPolygons = hotspotPolygons;
      state.contourData = contourData;
      state.interpolatedSurfaceData = interpolatedSurfaceData;
      state.vectorFieldData = vectorFieldData;
      state.explainablityPoints = [
        [5, 5],
        [-5, -5],
      ];
    });
    getPaths(state.currentDatasetType).then((pathData) => {
      state.pathData = pathData;
    });

    // Dan

    // state.anchors = {
    //   ids: [1, 838, 631, 118, 25, 16],
    //   coords: [
    //     [-69.27931941547946, 1.5414451547237649],
    //     [78.02619974932311, 2.7348173333762436],
    //     [7.206238614223301, 56.73490856487142],
    //     [6.758954655827237, -46.04427060655759],
    //     [-16.35071688508292, -37.83983684572523],
    //     [-35.583927379389145, -22.47517001749227],
    //   ],
    // };

    // state.mapAnnotation = {
    //   type: "FeatureCollection",
    //   features: [
    //     {
    //       type: "Feature",
    //       properties: { name: "Statewide Wet" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00020880712300861635, -0.0003323983673132487],
    //             [-0.0001827254889573583, 0.00003170454893683623],
    //             [-0.0003944523630973354, 0.0003736093369497167],
    //             [-0.0007392629047985346, 0.000025865128986869878],
    //             [-0.00020880712300861635, -0.0003323983673132487],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Statewide Dry" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [0.00031562937408765554, -0.0002918254020481641],
    //             [0.0007777157355818937, -0.000036925550269369834],
    //             [0.0007788854646905354, 0.00006473258285794732],
    //             [0.0003349805063818377, 0.00038276895805821286],
    //             [0.00031562937408765554, -0.0002918254020481641],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Wetter South - Drier North" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.000197243145253339, -0.00034602986056810135],
    //             [0.00007943350233300738, -0.00048343185201393427],
    //             [0.0003068093218718378, -0.00029772749636751715],
    //             [0.00031569172860774125, -0.0000816096113329609],
    //             [-0.0001810757604595207, -0.00007579812212365184],
    //             [-0.000197243145253339, -0.00034602986056810135],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Intermediate" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00017538143410634585, -0.00006098036647359003],
    //             [0.0003152785935616139, -0.00008018429468211624],
    //             [0.00032018804385115806, 0.00017014126608974636],
    //             [-0.0002593029117849509, 0.00017220000268590105],
    //             [-0.00017332261666049115, 0.00003111432966426474],
    //             [-0.00017538143410634585, -0.00006098036647359003],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Wetter North - Drier South" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.0002572510339023002, 0.0001775914170696011],
    //             [0.0003209798592489928, 0.00017828002962557622],
    //             [0.0003247463290983218, 0.0003865552446460957],
    //             [0.00005557494425279523, 0.0005830699045486954],
    //             [-0.0003855914855360708, 0.0003802480338279117],
    //             [-0.0002572510339023002, 0.0001775914170696011],
    //           ],
    //         ],
    //       },
    //     },
    //   ],
    // };

    // Tom

    // state.anchors = {
    //   ids: [91, 838, 631, 118, 811, 298, 451, 25, 16, 181, 286],
    //   coords: [
    //     [-64.50387053624989, 7.309372037072896],
    //     [68.67755639590882, 6.51304576299202],
    //     [-1.7757131826952528, 52.96073171301561],
    //     [6.331669297853566, -56.13128815334802],
    //     [22.249768141985616, 41.684123054978514],
    //     [22.117462188018056, -41.852197156217706],
    //     [-23.644043173635602, 39.049433019758645],
    //     [-25.128929759424263, -43.33786981399507],
    //     [-41.732661788023144, -24.29424737284994],
    //     [-47.53721851646967, 24.868012044435577],
    //     [-17.839486445414334, -14.704905549733025],
    //   ],
    // };

    state.anchors = {
      ids: [1, 838],
      coords: [
        [67.40414894026932, 8.552506707396066],
        [-60.39531036300677, -3.232043559813041],
      ],
    };
    state.mapAnnotation = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "Dry Global" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0.00021582713149868445, -0.00041213860385368043],
                [0.0007759756416733351, 0.00008921093715560252],
                [0.0006647828201832102, 0.00012169776954600421],
                [0.00022203661570317058, 0.0004383661123024598],
                [0.00021582713149868445, -0.00041213860385368043],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "Wet Global" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.0006037275300954332, -0.000053379232934562235],
                [-0.00013700916438129113, -0.00038074837657918334],
                [-0.00015090912642480667, 0.00044514149779275615],
                [-0.0005795038297581265, 0.00006564379200385872],
                [-0.0006037275300954332, -0.000053379232934562235],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "Dry SW" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.00012558186366089615, -0.00038503018672916237],
                [0.00021398311286413126, -0.00043656489413781074],
                [0.00021385034475639687, -0.00012648334376992576],
                [0.0000692276450137085, -0.00012913764041335083],
                [-0.00013290203165569552, -0.00022075184224225686],
                [-0.00012558186366089615, -0.00038503018672916237],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "Remainder" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.00013848954442322527, 0.0004450542173165207],
                [-0.00012902554530037945, -0.00018820708877055105],
                [0.00006374027781165634, -0.0001233606757434425],
                [0.0002136235494526145, -0.0001196122687094272],
                [0.00020383418200307652, 0.0004690240636538704],
                [-0.00013848954442322527, 0.0004450542173165207],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "Wet NE" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.00011614499477126095, 0.00045537853009482073],
                [0.00014152262467188496, 0.00046929511544732336],
                [0.00008688063137880373, 0.000582236268202743],
                [-0.00005002827922181731, 0.0005748468860074653],
                [-0.00011614499477126095, 0.00045537853009482073],
              ],
            ],
          },
        },
      ],
    };

    // state.mapAnnotation = {
    //   type: "FeatureCollection",
    //   features: [
    //     {
    //       type: "Feature",
    //       properties: {
    //         llmGeneratedSummary:
    //           "The observations indicate a predominance of neutral precipitation regions across Northern and Southern California, encompassing various landscapes. High and moderate-high precipitation areas are primarily concentrated in Northern coastal and mountainous regions. Moderate-low and low precipitation regions are less represented, primarily found in specific coastal and Sierra Nevada areas.",
    //         idsContained: [
    //           [13, 9],
    //           [13, 10],
    //           [13, 11],
    //           [14, 5],
    //           [14, 6],
    //           [14, 7],
    //           [14, 8],
    //           [14, 9],
    //           [14, 10],
    //           [14, 11],
    //           [15, 0],
    //           [15, 1],
    //           [15, 2],
    //           [15, 4],
    //           [15, 5],
    //           [15, 6],
    //           [15, 7],
    //           [15, 8],
    //           [15, 9],
    //           [15, 10],
    //           [15, 11],
    //           [16, 0],
    //           [16, 1],
    //           [16, 2],
    //           [16, 3],
    //           [16, 4],
    //           [16, 5],
    //           [16, 6],
    //           [16, 7],
    //           [16, 8],
    //           [16, 9],
    //           [16, 10],
    //           [16, 11],
    //           [17, 0],
    //           [17, 1],
    //           [17, 2],
    //           [17, 3],
    //           [17, 4],
    //           [17, 5],
    //           [17, 6],
    //           [17, 7],
    //           [17, 8],
    //           [17, 9],
    //           [17, 10],
    //           [17, 11],
    //           [18, 0],
    //           [18, 1],
    //           [18, 2],
    //           [18, 3],
    //           [18, 4],
    //           [18, 5],
    //           [18, 6],
    //           [18, 7],
    //           [18, 8],
    //           [18, 9],
    //           [18, 10],
    //           [18, 11],
    //           [19, 0],
    //           [19, 1],
    //           [19, 2],
    //           [19, 3],
    //           [19, 4],
    //           [19, 5],
    //           [19, 6],
    //           [19, 7],
    //           [19, 8],
    //           [19, 9],
    //           [19, 10],
    //           [19, 11],
    //           [19, 12],
    //           [20, 0],
    //           [20, 1],
    //           [20, 2],
    //           [20, 3],
    //           [20, 4],
    //           [20, 5],
    //           [20, 6],
    //           [20, 7],
    //           [20, 8],
    //           [20, 9],
    //           [20, 10],
    //           [20, 11],
    //           [20, 12],
    //           [21, 0],
    //           [21, 1],
    //           [21, 2],
    //           [21, 3],
    //           [21, 4],
    //           [21, 5],
    //           [21, 6],
    //           [21, 7],
    //           [21, 8],
    //           [21, 9],
    //           [21, 10],
    //           [21, 11],
    //           [21, 12],
    //           [21, 13],
    //           [22, 0],
    //           [22, 1],
    //           [22, 2],
    //           [22, 3],
    //           [22, 4],
    //           [22, 5],
    //           [22, 6],
    //           [22, 7],
    //           [22, 8],
    //           [22, 9],
    //           [22, 10],
    //           [22, 11],
    //           [22, 12],
    //           [23, 0],
    //           [23, 1],
    //           [23, 2],
    //           [23, 3],
    //           [23, 4],
    //           [23, 5],
    //           [23, 6],
    //           [23, 7],
    //           [23, 8],
    //           [23, 9],
    //           [23, 10],
    //           [23, 11],
    //           [23, 12],
    //           [24, 0],
    //           [24, 1],
    //           [24, 2],
    //           [24, 3],
    //           [24, 4],
    //           [24, 5],
    //           [24, 6],
    //           [24, 7],
    //           [24, 8],
    //           [24, 9],
    //           [24, 10],
    //           [24, 11],
    //           [25, 0],
    //           [25, 1],
    //           [25, 2],
    //           [25, 3],
    //           [25, 4],
    //           [25, 5],
    //           [25, 6],
    //           [25, 7],
    //           [25, 8],
    //           [25, 9],
    //           [25, 10],
    //           [26, 0],
    //           [26, 1],
    //           [26, 2],
    //           [26, 3],
    //           [26, 4],
    //           [26, 5],
    //           [26, 6],
    //           [26, 7],
    //           [26, 8],
    //           [27, 0],
    //           [27, 2],
    //           [27, 3],
    //           [27, 4],
    //           [27, 5],
    //           [27, 7],
    //           [28, 1],
    //           [28, 2],
    //           [28, 3],
    //           [28, 4],
    //           [28, 6],
    //           [29, 0],
    //           [29, 1],
    //           [29, 2],
    //           [29, 3],
    //           [29, 4],
    //           [29, 6],
    //         ],
    //         name: "Neutral - Wet North",
    //       },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00025633932734308104, 0.0004156314999841384],
    //             [-0.00013433335418611183, 0.00004839959070386408],
    //             [0.0001673431069659137, 0.00012063198277090776],
    //             [0.00019162290254258197, 0.00043141336722601724],
    //             [-0.0000414631357160557, 0.0005364234833444632],
    //             [-0.00025633932734308104, 0.0004156314999841384],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Neutral" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00014040330313116778, 0.00003929466734989125],
    //             [-0.00011794449215404962, -0.0001780095038449787],
    //             [0.00018251797921405358, -0.0001434107949523042],
    //             [0.0001624871478556689, 0.00010970607467744038],
    //             [-0.00014040330313116778, 0.00003929466734989125],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Neutral - Wet South" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00013979630811198444, -0.00045237119462975244],
    //             [0.00009328973009576437, -0.0005634512596678099],
    //             [0.00025717835089983073, -0.0004110955420654497],
    //             [0.00017523404051051977, -0.0001561576876325995],
    //             [-0.00011551651258620502, -0.00018529344254851251],
    //             [-0.00013979630811198444, -0.00045237119462975244],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Dry" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [0.0002672227474625029, -0.00041686233404926486],
    //             [0.0006612115901078914, 0.00001838492733760712],
    //             [0.0006571438588570228, 0.000100320660050831],
    //             [0.00019458468653605777, 0.0004298069045768447],
    //             [0.0001713405071454442, 0.00010961833176127644],
    //             [0.0001847059104120914, -0.00014606764283313923],
    //             [0.0002672227474625029, -0.00041686233404926486],
    //           ],
    //         ],
    //       },
    //     },
    //     {
    //       type: "Feature",
    //       properties: { name: "Wet" },
    //       geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //           [
    //             [-0.00026332564968796246, 0.0004059816205945991],
    //             [-0.0006212860140641667, 0.00017876976583765174],
    //             [-0.0006195427007472706, 0.000009668359989793715],
    //             [-0.0001482669610276032, -0.00045521523026514384],
    //             [-0.00012211725911138516, -0.0001815150165106916],
    //             [-0.00014303702079702623, 0.000050926778514999455],
    //             [-0.00026332564968796246, 0.0004059816205945991],
    //           ],
    //         ],
    //       },
    //     },
    //   ],
    // };
    // {"ids":[91,838,631,118,811,298,451,25,16,181,286],"coords":[[-64.50387053624989,7.309372037072896],[68.67755639590882,6.51304576299202],[-1.7757131826952528,52.96073171301561],[6.331669297853566,-56.13128815334802],[22.249768141985616,41.684123054978514],[22.117462188018056,-41.852197156217706],[-23.644043173635602,39.049433019758645],[-25.128929759424263,-43.33786981399507],[-41.732661788023144,-24.29424737284994],[-47.53721851646967,24.868012044435577],[-17.839486445414334,-14.704905549733025]]}
    // {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"llmGeneratedSummary":"The observations indicate a predominance of neutral precipitation regions across Northern and Southern California, encompassing various landscapes. High and moderate-high precipitation areas are primarily concentrated in Northern coastal and mountainous regions. Moderate-low and low precipitation regions are less represented, primarily found in specific coastal and Sierra Nevada areas.","idsContained":[[13,9],[13,10],[13,11],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[15,0],[15,1],[15,2],[15,4],[15,5],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[16,0],[16,1],[16,2],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[17,0],[17,1],[17,2],[17,3],[17,4],[17,5],[17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[18,0],[18,1],[18,2],[18,3],[18,4],[18,5],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],[19,0],[19,1],[19,2],[19,3],[19,4],[19,5],[19,6],[19,7],[19,8],[19,9],[19,10],[19,11],[19,12],[20,0],[20,1],[20,2],[20,3],[20,4],[20,5],[20,6],[20,7],[20,8],[20,9],[20,10],[20,11],[20,12],[21,0],[21,1],[21,2],[21,3],[21,4],[21,5],[21,6],[21,7],[21,8],[21,9],[21,10],[21,11],[21,12],[21,13],[22,0],[22,1],[22,2],[22,3],[22,4],[22,5],[22,6],[22,7],[22,8],[22,9],[22,10],[22,11],[22,12],[23,0],[23,1],[23,2],[23,3],[23,4],[23,5],[23,6],[23,7],[23,8],[23,9],[23,10],[23,11],[23,12],[24,0],[24,1],[24,2],[24,3],[24,4],[24,5],[24,6],[24,7],[24,8],[24,9],[24,10],[24,11],[25,0],[25,1],[25,2],[25,3],[25,4],[25,5],[25,6],[25,7],[25,8],[25,9],[25,10],[26,0],[26,1],[26,2],[26,3],[26,4],[26,5],[26,6],[26,7],[26,8],[27,0],[27,2],[27,3],[27,4],[27,5],[27,7],[28,1],[28,2],[28,3],[28,4],[28,6],[29,0],[29,1],[29,2],[29,3],[29,4],[29,6]],"name":"Neutral - Wet North"},"geometry":{"type":"Polygon","coordinates":[[[-0.00025633932734308104,0.0004156314999841384],[-0.00013433335418611183,0.00004839959070386408],[0.0001673431069659137,0.00012063198277090776],[0.00019162290254258197,0.00043141336722601724],[-0.0000414631357160557,0.0005364234833444632],[-0.00025633932734308104,0.0004156314999841384]]]}},{"type":"Feature","properties":{"name":"Neutral"},"geometry":{"type":"Polygon","coordinates":[[[-0.00014040330313116778,0.00003929466734989125],[-0.00011794449215404962,-0.0001780095038449787],[0.00018251797921405358,-0.0001434107949523042],[0.0001624871478556689,0.00010970607467744038],[-0.00014040330313116778,0.00003929466734989125]]]}},{"type":"Feature","properties":{"name":"Neutral - Wet South"},"geometry":{"type":"Polygon","coordinates":[[[-0.00013979630811198444,-0.00045237119462975244],[0.00009328973009576437,-0.0005634512596678099],[0.00025717835089983073,-0.0004110955420654497],[0.00017523404051051977,-0.0001561576876325995],[-0.00011551651258620502,-0.00018529344254851251],[-0.00013979630811198444,-0.00045237119462975244]]]}},{"type":"Feature","properties":{"name":"Dry"},"geometry":{"type":"Polygon","coordinates":[[[0.0002672227474625029,-0.00041686233404926486],[0.0006612115901078914,0.00001838492733760712],[0.0006571438588570228,0.000100320660050831],[0.00019458468653605777,0.0004298069045768447],[0.0001713405071454442,0.00010961833176127644],[0.0001847059104120914,-0.00014606764283313923],[0.0002672227474625029,-0.00041686233404926486]]]}},{"type":"Feature","properties":{"name":"Wet"},"geometry":{"type":"Polygon","coordinates":[[[-0.00026332564968796246,0.0004059816205945991],[-0.0006212860140641667,0.00017876976583765174],[-0.0006195427007472706,0.000009668359989793715],[-0.0001482669610276032,-0.00045521523026514384],[-0.00012211725911138516,-0.0001815150165106916],[-0.00014303702079702623,0.000050926778514999455],[-0.00026332564968796246,0.0004059816205945991]]]}}]}
    return state;
  },
  getters: {
    isDataReady() {
      return this.pathData != null && this.nodeMap != null;
    },
    getFiles(): [EnsembleMember[], EnsembleMember[]] {
      return this.files;
    },
    getMonthsSelected() {
      return this.monthsSelected;
    },
    getYearsSelected() {
      return this.yearsSelected;
    },
    getSubsetType() {
      return this.subsetType;
    },
    getHoveredFile() {
      return this.hoveredFile;
    },
    getNodeMap: (state) => {
      return (timeType: timeType) => state.nodeMap[timeType];
    },
    getPathData: (state) => {
      return (timeType: timeType) => state.pathData[timeType];
    },
    getHotspotPolygons: (state) => {
      return (timeType: timeType) => state.hotspotPolygons[timeType];
    },
    getClassifyData: (state) => {
      return (timeType: timeType) => state.classifyData[timeType];
    },
    getContourData: (state) => {
      return (timeType: timeType) => state.contourData[timeType];
    },
    getInterpolatedSurfaceData: (state) => {
      return (timeType: timeType) => state.interpolatedSurfaceData[timeType];
    },
    getVectorFieldData: (state) => {
      return (timeType: timeType) => state.vectorFieldData[timeType];
    },
    getLLMQueryResult() {
      return this.LLMQueries;
    },
    getHighlightedNodes(state) {
      return this.highlightedNodes;
    },
    getMapEditFlag() {
      return this.mapEditFlag;
    },
    getRedrawFlag() {
      return this.redrawFlag;
    },
    getExlainablityPoints() {
      return this.explainablityPoints;
    },
    getMapMode() {
      return this.mapMode;
    },
    getContourLevels() {
      return this.contourLevels;
    },
  },
  actions: {
    setFiles({ group1, group2 }: { group1: any[]; group2?: any[] }) {
      this.files = [group1, group2 || []];
    },
    updateElements({ files, monthsSelected, yearsSelected, subsetType }) {
      this.files = files;
      this.monthsSelected = monthsSelected;
      this.yearsSelected = yearsSelected;
      this.subsetType = subsetType;
    },
    setHoveredFile(file) {
      this.hoveredFile = file;
    },
    updateMapping(time_type, id, coords) {
      this.nodeMap[time_type][id].coords = coords;
    },
    async updateMDE(anchors) {
      const data = await getNodeData({
        dataset_name: this.currentDatasetType,
        anchors: anchors,
      });
      const {
        nodeMap,
        classifyData,
        hotspotPolygons,
        contourData,
        interpolatedSurfaceData,
      } = data;
      this.nodeMap = nodeMap;
      this.classifyData = classifyData;
      this.hotspotPolygons = hotspotPolygons;
      this.contourData = contourData;
      this.interpolatedSurfaceData = interpolatedSurfaceData;
      this.mapEditFlag = !this.mapEditFlag;
    },
    async updateVectorFieldSetting(setting) {
      let vectorFieldData: PartialRecord<timeType, any> = {};
      try {
        let vectorField = await API.fetchData("/get_forcing", true, setting);
        vectorFieldData[setting["time_type"]] = vectorField;
        // let transition = await API.fetchData("/get_forcing_transition", true, {
        //   zones: setting["zones"],
        //   u: vectorField["u"],
        //   v: vectorField["v"],
        //   x: vectorField["x"],
        //   y: vectorField["y"],
        // });

        // Object.keys(transition).forEach((zoneID) => {
        //   const counted = transition[zoneID].reduce((acc, item) => {
        //     acc[item] = (acc[item] || 0) + 1;
        //     return acc;
        //   }, {});
        //   console.log("DEBUG UPDATEVECTOR FIELD TRANSITION: ", zoneID, counted);
        // });
      } catch (error) {
        vectorFieldData[setting["time_type"]] = null;
      }
      this.vectorFieldData = vectorFieldData;
    },
  },
});

//{"ids":[91,838,631,118,811,298,451,25,16,181,286],"coords":[[-64.50387053624989,7.309372037072896],[68.67755639590882,6.51304576299202],[-1.7757131826952528,52.96073171301561],[6.331669297853566,-56.13128815334802],[22.249768141985616,41.684123054978514],[22.117462188018056,-41.852197156217706],[-23.644043173635602,39.049433019758645],[-25.128929759424263,-43.33786981399507],[-41.732661788023144,-24.29424737284994],[-47.53721851646967,24.868012044435577],[-17.839486445414334,-14.704905549733025]]}
//{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"llmGeneratedSummary":"The observations indicate a predominance of neutral precipitation regions across Northern and Southern California, encompassing various landscapes. High and moderate-high precipitation areas are primarily concentrated in Northern coastal and mountainous regions. Moderate-low and low precipitation regions are less represented, primarily found in specific coastal and Sierra Nevada areas.","idsContained":[[13,9],[13,10],[13,11],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[15,0],[15,1],[15,2],[15,4],[15,5],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[16,0],[16,1],[16,2],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[17,0],[17,1],[17,2],[17,3],[17,4],[17,5],[17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[18,0],[18,1],[18,2],[18,3],[18,4],[18,5],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],[19,0],[19,1],[19,2],[19,3],[19,4],[19,5],[19,6],[19,7],[19,8],[19,9],[19,10],[19,11],[19,12],[20,0],[20,1],[20,2],[20,3],[20,4],[20,5],[20,6],[20,7],[20,8],[20,9],[20,10],[20,11],[20,12],[21,0],[21,1],[21,2],[21,3],[21,4],[21,5],[21,6],[21,7],[21,8],[21,9],[21,10],[21,11],[21,12],[21,13],[22,0],[22,1],[22,2],[22,3],[22,4],[22,5],[22,6],[22,7],[22,8],[22,9],[22,10],[22,11],[22,12],[23,0],[23,1],[23,2],[23,3],[23,4],[23,5],[23,6],[23,7],[23,8],[23,9],[23,10],[23,11],[23,12],[24,0],[24,1],[24,2],[24,3],[24,4],[24,5],[24,6],[24,7],[24,8],[24,9],[24,10],[24,11],[25,0],[25,1],[25,2],[25,3],[25,4],[25,5],[25,6],[25,7],[25,8],[25,9],[25,10],[26,0],[26,1],[26,2],[26,3],[26,4],[26,5],[26,6],[26,7],[26,8],[27,0],[27,2],[27,3],[27,4],[27,5],[27,7],[28,1],[28,2],[28,3],[28,4],[28,6],[29,0],[29,1],[29,2],[29,3],[29,4],[29,6]],"name":"Neutral - Wet North"},"geometry":{"type":"Polygon","coordinates":[[[-0.00025633932734308104,0.0004156314999841384],[-0.00013433335418611183,0.00004839959070386408],[0.0001673431069659137,0.00012063198277090776],[0.00019162290254258197,0.00043141336722601724],[-0.0000414631357160557,0.0005364234833444632],[-0.00025633932734308104,0.0004156314999841384]]]}},{"type":"Feature","properties":{"name":"Neutral"},"geometry":{"type":"Polygon","coordinates":[[[-0.00014040330313116778,0.00003929466734989125],[-0.00011794449215404962,-0.0001780095038449787],[0.00018251797921405358,-0.0001434107949523042],[0.0001624871478556689,0.00010970607467744038],[-0.00014040330313116778,0.00003929466734989125]]]}},{"type":"Feature","properties":{"name":"Neutral - Wet South"},"geometry":{"type":"Polygon","coordinates":[[[-0.00013979630811198444,-0.00045237119462975244],[0.00009328973009576437,-0.0005634512596678099],[0.00025717835089983073,-0.0004110955420654497],[0.00017523404051051977,-0.0001561576876325995],[-0.00011551651258620502,-0.00018529344254851251],[-0.00013979630811198444,-0.00045237119462975244]]]}},{"type":"Feature","properties":{"name":"Dry"},"geometry":{"type":"Polygon","coordinates":[[[0.0002672227474625029,-0.00041686233404926486],[0.0006612115901078914,0.00001838492733760712],[0.0006571438588570228,0.000100320660050831],[0.00019458468653605777,0.0004298069045768447],[0.0001713405071454442,0.00010961833176127644],[0.0001847059104120914,-0.00014606764283313923],[0.0002672227474625029,-0.00041686233404926486]]]}},{"type":"Feature","properties":{"name":"Wet"},"geometry":{"type":"Polygon","coordinates":[[[-0.00026332564968796246,0.0004059816205945991],[-0.0006212860140641667,0.00017876976583765174],[-0.0006195427007472706,0.000009668359989793715],[-0.0001482669610276032,-0.00045521523026514384],[-0.00012211725911138516,-0.0001815150165106916],[-0.00014303702079702623,0.000050926778514999455],[-0.00026332564968796246,0.0004059816205945991]]]}}]}
