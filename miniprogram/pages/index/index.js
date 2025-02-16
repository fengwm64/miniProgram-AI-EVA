// index.js

// 模型输入的图像尺寸和通道数
const modelHeight = 50.0;  // 模型所需的输入高度
const modelWidth = 50.0;   // 模型所需的输入宽度
const modelChannel = 3;    // 模型输入的通道数（例如，3表示RGB图像）

Page({
  data: {
    datasetLabels: {},
    datasetImages: [],
    modelPath: `${wx.env.USER_DATA_PATH}/mobilenetv3.onnx`,
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

  // 检查并下载缺失的图片
  checkAndDownloadImages: function (images) {
    const that = this;
    const fileManager = wx.getFileSystemManager();
    let downloadedImages = [];
    let downloadCount = 0;
    const total = images.length;
    const maxRetries = 3; // 最大重试次数

    // 检查图片是否已存在
    const checkAndDownloadImage = (imgInfo, retryCount = 0) => {
      const localPath = `${wx.env.USER_DATA_PATH}/${imgInfo.name.replace(/\//g, '_')}`;

      fileManager.access({
        path: localPath,
        success: () => {
          console.log(`图片 ${imgInfo.name} 已存在，直接使用`);
          downloadedImages.push({
            name: imgInfo.name,
            path: localPath,
            label: imgInfo.label
          });
          downloadCount++;
          if (downloadCount === total) {
            wx.showToast({
              title: "数据集下载完成",
              icon: "success"
            });
            that.setData({ datasetImages: downloadedImages });
          }
        },
        fail: () => {
          console.log(`图片 ${imgInfo.name} 不存在，开始下载`);
          that.downloadImageWithRetry(imgInfo, retryCount);
        }
      });
    };

    // 下载单张图片，支持重试
    this.downloadImageWithRetry = (imgInfo, retryCount = 0) => {
      wx.downloadFile({
        url: imgInfo.url,
        success: (res) => {
          if (res.statusCode === 200) {
            const localPath = `${wx.env.USER_DATA_PATH}/${imgInfo.name.replace(/\//g, '_')}`;
            fileManager.saveFile({
              tempFilePath: res.tempFilePath,
              filePath: localPath,
              success: (saveRes) => {
                console.log(`图片 ${imgInfo.name} 保存成功: `, saveRes.savedFilePath);
                downloadedImages.push({
                  name: imgInfo.name,
                  path: saveRes.savedFilePath,
                  label: imgInfo.label
                });
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              },
              fail: (err) => {
                console.error(`图片 ${imgInfo.name} 保存失败`, err);
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              }
            });
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，状态码：`, res.statusCode);
            if (retryCount < maxRetries) {
              console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
              that.downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
            } else {
              console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
              downloadCount++;
              if (downloadCount === total) {
                wx.showToast({
                  title: "数据集下载完成",
                  icon: "success"
                });
                that.setData({ datasetImages: downloadedImages });
              }
            }
          }
        },
        fail: (err) => {
          console.error(`图片 ${imgInfo.name} 下载失败`, err);
          if (retryCount < maxRetries) {
            console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
            that.downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
            downloadCount++;
            if (downloadCount === total) {
              wx.showToast({
                title: "数据集下载完成",
                icon: "success"
              });
              that.setData({ datasetImages: downloadedImages });
            }
          }
        }
      });
    };

    // 遍历所有图片，开始下载
    images.forEach((imgInfo) => {
      checkAndDownloadImage(imgInfo);
    });
  },

  // 下载单张图片，支持重试
  downloadImageWithRetry: function (imgInfo, retryCount = 0) {
    const that = this;
    wx.downloadFile({
      url: imgInfo.url,
      success: (res) => {
        if (res.statusCode === 200) {
          const localPath = `${wx.env.USER_DATA_PATH}/${imgInfo.name.replace(/\//g, '_')}`;
          wx.getFileSystemManager().saveFile({
            tempFilePath: res.tempFilePath,
            filePath: localPath,
            success: (saveRes) => {
              console.log(`图片 ${imgInfo.name} 保存成功: `, saveRes.savedFilePath);
              that.data.datasetImages.push({
                name: imgInfo.name,
                path: saveRes.savedFilePath,
                label: imgInfo.label
              });
              that.setData({ datasetImages: that.data.datasetImages });
            },
            fail: (err) => {
              console.error(`图片 ${imgInfo.name} 保存失败`, err);
            }
          });
        } else {
          console.error(`图片 ${imgInfo.name} 下载失败，状态码：`, res.statusCode);
          if (retryCount < 3) {
            console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
            that.downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
          }
        }
      },
      fail: (err) => {
        console.error(`图片 ${imgInfo.name} 下载失败`, err);
        if (retryCount < 3) {
          console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
          that.downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
        } else {
          console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
        }
      }
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
                    that.checkAndDownloadImages(dataset.images); // 调用 checkAndDownloadImages
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

  // 遍历图片列表，下载所有图片并保存到本地
  downloadImages: function (images) {
    const that = this;
    const fileManager = wx.getFileSystemManager();
    let downloadedImages = [];
    let downloadCount = 0;
    const total = images.length;
    const maxRetries = 3; // 最大重试次数

    // 下载单张图片，支持重试
    const downloadImageWithRetry = (imgInfo, retryCount = 0) => {
      wx.downloadFile({
        url: imgInfo.url,
        success: (res) => {
          if (res.statusCode === 200) {
            // 避免目录结构问题，将斜杠替换为下划线保存为文件名
            const localPath = `${wx.env.USER_DATA_PATH}/${imgInfo.name.replace(/\//g, '_')}`;
            fileManager.saveFile({
              tempFilePath: res.tempFilePath,
              filePath: localPath,
              success: (saveRes) => {
                console.log(`图片 ${imgInfo.name} 保存成功: `, saveRes.savedFilePath);
                downloadedImages.push({
                  name: imgInfo.name,
                  path: saveRes.savedFilePath,
                  label: imgInfo.label
                });
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              },
              fail: (err) => {
                console.error(`图片 ${imgInfo.name} 保存失败`, err);
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              }
            });
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，状态码：`, res.statusCode);
            if (retryCount < maxRetries) {
              console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
              downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
            } else {
              console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
              downloadCount++;
              if (downloadCount === total) {
                wx.showToast({
                  title: "数据集下载完成",
                  icon: "success"
                });
                that.setData({ datasetImages: downloadedImages });
              }
            }
          }
        },
        fail: (err) => {
          console.error(`图片 ${imgInfo.name} 下载失败`, err);
          if (retryCount < maxRetries) {
            console.log(`第 ${retryCount + 1} 次重试下载图片 ${imgInfo.name}`);
            downloadImageWithRetry(imgInfo, retryCount + 1); // 重试下载
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，已达到最大重试次数`);
            downloadCount++;
            if (downloadCount === total) {
              wx.showToast({
                title: "数据集下载完成",
                icon: "success"
              });
              that.setData({ datasetImages: downloadedImages });
            }
          }
        }
      });
    };

    // 遍历所有图片，开始下载
    images.forEach((imgInfo) => {
      downloadImageWithRetry(imgInfo);
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

    console.log("开始评测，总图片数量：", images.length);

    // 遍历所有图片进行评测
    const results = [];
    const evaluateNext = async (index) => {
      if (index >= images.length) {
        console.log("所有图片评测完成，开始保存结果");
        that.saveResults(results);
        return;
      }

      const image = images[index];
      that.setData({ testImagePath: image.path });

      console.log(`开始评测第 ${index + 1} 张图片：${image.name}`);

      try {
        const imageData = await that.loadTestImage(image.path);
        const precisionLevels = [0, 1, 2, 3, 4];

        for (const precision of precisionLevels) {
          console.log(`正在使用精度等级 ${precision} 进行推理`);
          await that.initInference(precision);
          const startTime = Date.now();

          const predictedClass = await new Promise((resolve) => {
            that.runModelInference(imageData, resolve);
          });

          const inferenceTime = Date.now() - startTime;
          console.log(`精度等级 ${precision} 推理完成，耗时：${inferenceTime}ms`);

          results.push({
            image: image.name,
            precisionLevel: precision,
            timeMs: inferenceTime,
            predictedClass: predictedClass,
            actualClass: image.label
          });

          console.log(`图片 ${image.name} 在精度等级 ${precision} 下的结果：`, {
            predictedClass: predictedClass,
            actualClass: image.label,
            timeMs: inferenceTime
          });
        }
      } catch (error) {
        console.error(`图片 ${image.name} 评测失败`, error);
      }

      console.log(`第 ${index + 1} 张图片评测完成`);
      evaluateNext(index + 1);
    };

    evaluateNext(0);
  },

  // 加载测试图片
  loadTestImage: function (imagePath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          console.log("图片信息获取成功：", res);
          // 获取隐藏的 canvas 节点
          wx.createSelectorQuery()
            .select('#offscreenCanvas')
            .node((nodeResult) => {
              if (!nodeResult) {
                const errMsg = '未找到 offscreenCanvas 节点，请确保已在 WXML 中添加且页面已渲染完成';
                console.error(errMsg);
                return reject(new Error(errMsg));
              }
              const canvas = nodeResult.node;
              // 设置 canvas 尺寸
              canvas.width = modelWidth;
              canvas.height = modelHeight;
              // 获取 2D 绘图上下文（新版接口，与 Web 标准一致）
              const ctx = canvas.getContext('2d');
              // 绘制图片到 canvas 上
              ctx.drawImage(res.path, 0, 0, modelWidth, modelHeight);
              try {
                // 同步获取图像数据
                const imageData = ctx.getImageData(0, 0, modelWidth, modelHeight);
                console.log("图片数据加载成功");
                resolve(imageData);
              } catch (err) {
                console.error("获取图片数据失败", err);
                reject(err);
              }
            })
            .exec();
        },
        fail: (err) => {
          console.error("获取图片信息失败", err);
          reject(err);
        }
      });
    });
  },

  // 初始化推理会话（返回Promise）
  initInference: function (precisionLevel) {
    return new Promise((resolve, reject) => {
      if (this.session) this.session.destroy();

      console.log(`正在初始化推理会话，精度等级：${precisionLevel}`);
      this.session = wx.createInferenceSession({
        model: this.data.modelPath,
        precisionLevel: precisionLevel,
        allowNPU: true,
        allowQuantize: false,
      });

      this.session.onError((err) => {
        console.error(`推理会话初始化失败，精度等级：${precisionLevel}`, err);
        reject(err);
      });

      this.session.onLoad(() => {
        console.log(`推理会话初始化成功，精度等级：${precisionLevel}`);
        resolve();
      });
    });
  },

  // 执行模型推理
  runModelInference: function (imageData, callback) {
    console.log("开始预处理图片数据");
    this.preprocessImage(imageData)
      .then(processedData => {
        console.log("图片数据预处理完成");
        const inputTensor = {
          shape: [1, modelChannel, modelHeight, modelWidth],
          data: processedData.buffer,
          type: 'float32'
        };

        console.log("开始执行模型推理");
        return this.session.run({ "input": inputTensor });
      })
      .then(result => {
        console.log("模型推理完成");
        const output = new Float32Array(result.output.data);
        const predictedClass = this.getClass(this.getMaxIndex(output));
        console.log("推理结果：", predictedClass);
        callback(predictedClass);
      })
      .catch(error => {
        console.error("推理失败:", error);
        callback("Error");
      });
  },

  // 预处理图像
  preprocessImage: function (imageData) {
    return new Promise((resolve, reject) => {
      // 获取图像的原始数据并将其转换为 Uint8Array 以便逐像素访问
      const origData = new Uint8Array(imageData.data.buffer);
      // 创建一个 Float32Array，用于存储预处理后的数据。长度为目标尺寸的宽高与通道数的乘积
      var dstInput = new Float32Array(3 * modelHeight * modelWidth);

      // 计算缩放比率，用于将原图缩放到模型所需的尺寸
      const hRatio = imageData.height / modelHeight;
      const wRatio = imageData.width / modelWidth;

      // 原始图像在内存中的每行字节数，RGBA 四个通道（每个像素4字节）
      const origHStride = imageData.width * 4;
      const origWStride = 4;

      // 预定义的均值和标准差，用于归一化处理
      const mean = [0.485, 0.456, 0.406];
      const reverse_div = [4.367, 4.464, 4.444];  // 标准差的倒数
      const ratio = 1 / 255.0;
      // 计算归一化比例和均值调整，以简化公式
      const normalized_div = [ratio * reverse_div[0], ratio * reverse_div[1], ratio * reverse_div[2]];
      const normalized_mean = [mean[0] * reverse_div[0], mean[1] * reverse_div[1], mean[2] * reverse_div[2]];

      var idx = 0; // 用于遍历目标数组的索引

      // 遍历每个通道（RGB，假设为3通道）
      for (var c = 2; c >= 0; --c) { // 遍历 BGR 通道
        // 遍历模型要求的目标高度
        for (var h = 0; h < modelHeight; ++h) {
          // 计算对应原始图像中的高度位置
          const origH = Math.round(h * hRatio);
          const origHOffset = origH * origHStride; // 原图中当前行的偏移量

          // 遍历模型要求的目标宽度
          for (var w = 0; w < modelWidth; ++w) {
            // 计算对应原始图像中的宽度位置
            const origW = Math.round(w * wRatio);
            // 计算原始图像的当前像素的索引位置
            const origIndex = origHOffset + origW * origWStride + c;

            // 进行归一化处理：首先根据通道（RGB）缩放值，然后减去均值以消除偏差
            var val = origData[origIndex] * (normalized_div[c]) - normalized_mean[c];
            dstInput[idx] = val;  // 将归一化后的值存入目标数组
            idx++;
          }
        }
      }
      resolve(dstInput); // 返回预处理后的数据
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
    const classes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/', '=', '>', '<', '*', '-'];
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