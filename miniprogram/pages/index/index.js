// index.js
const modelWidth = 50.0; // 根据模型输入尺寸定义
const modelHeight = 50.0;

Page({
  data: {
    datasetLabels: {},
    datasetImages: [],
    modelPath: "",
    testImagePath: "" // 用于存储测试图片路径
  },

  // 清空指定路径的文件
  clearFile: function (filePath) {
    const fileManager = wx.getFileSystemManager();
    return new Promise((resolve, reject) => {
      fileManager.unlink({
        filePath: filePath,
        success: () => {
          console.log(`文件 ${filePath} 已删除`);
          resolve();
        },
        fail: (err) => {
          console.error(`删除文件 ${filePath} 失败`, err);
          reject(err);
        }
      });
    });
  },

  // 点击“下载评测数据集”按钮时调用
  downloadDataset: function () {
    const datasetUrl = "https://hub.fnas64.xin/https://raw.githubusercontent.com/fengwm64/miniprogram-ai-eva/main/dataset/labels.json";
    const fileManager = wx.getFileSystemManager();
    const labelsPath = `${wx.env.USER_DATA_PATH}/labels.json`;
    const that = this;

    // 检查文件是否存在
    fileManager.access({
      path: labelsPath,
      success: () => {
        // 文件已存在，弹出对话框让用户选择是否重新下载
        wx.showModal({
          title: "提示",
          content: "数据集已存在，是否重新下载？",
          success: (res) => {
            if (res.confirm) {
              // 用户选择重新下载，清空已下载的文件
              that.clearFile(labelsPath)
                .then(() => {
                  console.log("开始重新下载数据集");
                  that.downloadFileAndImages(datasetUrl, labelsPath);
                })
                .catch((err) => {
                  console.error("清空文件失败", err);
                });
            } else if (res.cancel) {
              // 用户选择取消，直接使用已下载的文件
              console.log("使用已下载的数据集");
              fileManager.readFile({
                filePath: labelsPath,
                encoding: "utf8",
                success: (readRes) => {
                  try {
                    let dataset = JSON.parse(readRes.data);
                    console.log("解析后的数据集：", dataset);
                    that.setData({ datasetLabels: dataset });
                    // 检查图片是否已下载
                    that.checkAndDownloadImages(dataset.images);
                  } catch (e) {
                    console.error("JSON 解析错误", e);
                  }
                },
                fail: (err) => {
                  console.error("读取标签文件失败", err);
                }
              });
            }
          }
        });
      },
      fail: () => {
        // 文件不存在，直接下载
        console.log("labels.json 不存在，开始下载");
        that.downloadFileAndImages(datasetUrl, labelsPath);
      }
    });
  },

  // 下载文件并处理图片
  downloadFileAndImages: function (fileUrl, filePath) {
    const that = this;
    const fileManager = wx.getFileSystemManager();

    wx.downloadFile({
      url: fileUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log("文件下载成功", res.tempFilePath);
          // 从临时文件读取内容，确保数据完整
          fileManager.readFile({
            filePath: res.tempFilePath,
            encoding: "utf8",
            success: (readTempRes) => {
              console.log("读取临时文件成功，内容：", readTempRes.data);
              // 将读取到的内容写入到目标路径
              fileManager.writeFile({
                filePath: filePath,
                data: readTempRes.data,
                encoding: "utf8",
                success: () => {
                  console.log("文件写入成功", filePath);
                  // 再次读取文件，解析 JSON 数据
                  fileManager.readFile({
                    filePath: filePath,
                    encoding: "utf8",
                    success: (readRes) => {
                      try {
                        let dataset = JSON.parse(readRes.data);
                        console.log("解析后的数据集：", dataset);
                        that.setData({ datasetLabels: dataset });
                        // 开始下载所有图片
                        that.downloadImages(dataset.images);
                      } catch (e) {
                        console.error("JSON 解析错误", e);
                      }
                    },
                    fail: (err) => {
                      console.error("读取文件失败", err);
                    }
                  });
                },
                fail: (err) => {
                  console.error("写入文件失败", err);
                }
              });
            },
            fail: (err) => {
              console.error("读取临时文件失败", err);
            }
          });
        } else {
          console.error("文件下载失败，状态码：", res.statusCode);
        }
      },
      fail: (err) => {
        console.error("下载文件失败", err);
      }
    });
  },

  // 点击“下载加载模型”按钮时调用
  downloadModel: function () {
    const modelUrl = "https://hub.fnas64.xin/https://raw.githubusercontent.com/fengwm64/miniprogram-ai-eva/main/model/best_mobilenet_v3_20250215_acc_0.99.onnx";
    const fileManager = wx.getFileSystemManager();
    const modelPath = `${wx.env.USER_DATA_PATH}/mobilenetv3.onnx`;
    const that = this;

    // 检查模型文件是否存在
    fileManager.access({
      path: modelPath,
      success: () => {
        // 文件已存在，弹出对话框让用户选择是否重新下载
        wx.showModal({
          title: "提示",
          content: "模型文件已存在，是否重新下载？",
          success: (res) => {
            if (res.confirm) {
              // 用户选择重新下载，清空已下载的文件
              that.clearFile(modelPath)
                .then(() => {
                  console.log("开始重新下载模型");
                  that.downloadModelFile(modelUrl, modelPath);
                })
                .catch((err) => {
                  console.error("清空文件失败", err);
                });
            } else if (res.cancel) {
              // 用户选择取消，直接使用已下载的文件
              console.log("使用已下载的模型");
              that.setData({ modelPath: modelPath });
              wx.showToast({
                title: "模型已加载",
                icon: "success"
              });
            }
          }
        });
      },
      fail: () => {
        // 文件不存在，直接下载
        console.log("模型文件不存在，开始下载");
        that.downloadModelFile(modelUrl, modelPath);
      }
    });
  },

  // 下载模型文件
  downloadModelFile: function (modelUrl, modelPath) {
    const that = this;
    const fileManager = wx.getFileSystemManager();

    wx.downloadFile({
      url: modelUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log("模型文件下载成功", res.tempFilePath);
          // 直接将模型保存到指定路径
          fileManager.saveFile({
            tempFilePath: res.tempFilePath,
            filePath: modelPath,
            success: (saveRes) => {
              console.log("模型文件保存成功:", saveRes.savedFilePath);
              that.setData({ modelPath: saveRes.savedFilePath });
              wx.showToast({
                title: "模型下载成功",
                icon: "success"
              });
            },
            fail: (err) => {
              console.error("模型文件保存失败", err);
            }
          });
        } else {
          console.error("模型文件下载失败，状态码：", res.statusCode);
        }
      },
      fail: (err) => {
        console.error("下载模型文件失败", err);
      }
    });
  },

  // 开始评测
  startEvaluation: function () {
    const that = this;
    const images = this.data.datasetImages;

    if (images.length === 0) {
      wx.showToast({ title: "请先下载数据集", icon: "none" });
      return;
    }

    // 遍历所有图片进行评测
    const results = [];
    const evaluateNext = async (index) => {
      if (index >= images.length) {
        that.saveResults(results);
        return;
      }

      const image = images[index];
      that.setData({ testImagePath: image.path });

      try {
        const imageData = await that.loadTestImage(image.path);
        const precisionLevels = [0, 1, 2, 3, 4];

        for (const precision of precisionLevels) {
          await that.initInference(precision);
          const startTime = Date.now();

          const predictedClass = await new Promise((resolve) => {
            that.runModelInference(imageData, resolve);
          });

          results.push({
            image: image.name,
            precisionLevel: precision,
            timeMs: Date.now() - startTime,
            predictedClass: predictedClass,
            actualClass: image.label
          });
        }
      } catch (error) {
        console.error(`图片 ${image.name} 评测失败`, error);
      }

      evaluateNext(index + 1);
    };

    evaluateNext(0);
  },

  // 加载测试图片数据
  loadTestImage: function (imagePath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          const ctx = wx.createCanvasContext('testCanvas');
          ctx.drawImage(res.path, 0, 0, modelWidth, modelHeight);
          ctx.draw(false, () => {
            wx.canvasGetImageData({
              canvasId: 'testCanvas',
              x: 0,
              y: 0,
              width: modelWidth,
              height: modelHeight,
              success: (imageData) => {
                resolve(imageData);
              },
              fail: reject
            });
          });
        },
        fail: reject
      });
    });
  },

  // 初始化推理会话（返回Promise）
  initInference: function (precisionLevel) {
    return new Promise((resolve, reject) => {
      if (this.session) this.session.destroy();

      this.session = wx.createInferenceSession({
        model: this.data.modelPath,
        precisionLevel: precisionLevel,
        allowNPU: true,
        allowQuantize: false,
      });

      this.session.onError(reject);
      this.session.onLoad(() => {
        console.log(`会话加载完成: 精度${precisionLevel}`);
        resolve();
      });
    });
  },

  // 执行模型推理
  runModelInference: function (imageData, callback) {
    this.preprocessImage(imageData)
      .then(processedData => {
        const inputTensor = {
          shape: [1, 3, modelHeight, modelWidth],
          data: processedData.buffer,
          type: 'float32'
        };

        return this.session.run({ "input": inputTensor });
      })
      .then(result => {
        const output = new Float32Array(result.output.data);
        callback(this.getClass(this.getMaxIndex(output)));
      })
      .catch(error => {
        console.error("推理失败:", error);
        callback("Error");
      });
  },

  // 预处理图像（优化版）
  preprocessImage: function (imageData) {
    return new Promise((resolve) => {
      const rgbaData = new Uint8Array(imageData.data);
      const float32Data = new Float32Array(3 * modelHeight * modelWidth);

      // 预处理参数
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];

      let offset = 0;
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < modelHeight * modelWidth; i++) {
          const val = rgbaData[i * 4 + c] / 255; // 转换到 [0,1] 范围
          float32Data[offset++] = (val - mean[c]) / std[c]; // 标准化
        }
      }
      resolve(float32Data);
    });
  },

  // 获取最大值索引的方法
  getMaxIndex: function (array) {
    let maxIndex = 0; // 初始化最大索引为0
    for (let i = 1; i < array.length; i++) {
      // 遍历数组，寻找最大值的索引
      if (array[i] > array[maxIndex]) {
        maxIndex = i; // 更新最大值索引
      }
    }
    return maxIndex; // 返回最大值的索引
  },
  getClass: function (index) {
    // 假设有一个类别数组
    const classes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/', '=', , '>', '<', '*', '-'];
    const className = classes[index] || 'Unknown Class'; // 根据索引获取对应的类别名称
    return classes[index] || 'Unknown Class';
  },

  // 保存评测结果
  saveResults: function (results) {
    const fileManager = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/inference_results.json`;

    fileManager.writeFile({
      filePath: filePath,
      data: JSON.stringify(results, null, 2),
      encoding: "utf8",
      success: () => {
        console.log("评测结果已保存:", filePath);
        wx.showToast({ title: "评测完成", icon: "success" });
      },
      fail: (err) => {
        console.error("保存评测结果失败:", err);
      }
    });
  }
});