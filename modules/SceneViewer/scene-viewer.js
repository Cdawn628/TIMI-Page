export class ViewerModule {
  constructor(container, modelBaseNames, modelPath, imagePath) {
    this.container = container;
    this.modelBaseNames = modelBaseNames;
    this.modelPath = modelPath;
    this.imagePath = imagePath;
    this.imageExtension = ".png";
    // 1. 后缀改为 .obj
    this.modelExtension = ".obj"; 
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.controls = null;
  }

  init() {
    this.setupScene();
    this.createImageSlider();
    this.loadModel(this.modelBaseNames[0]);
  }

  setupScene() {
    const viewerContainer = document.querySelector(
      `${this.container} #viewer-container`
    );
    const width = viewerContainer.clientWidth;
    const height = viewerContainer.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    this.camera.position.set(0, 1, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xffffff);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;
    viewerContainer.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const lightIntensity = 18;
    const lightDistance = 100;

    const directions = [
      [10, 0, 0], // +x
      [-10, 0, 0], // -x
      [0, 10, 0], // +y
      [0, -10, 0], // -y
      [0, 0, 10], // +z
      [0, 0, -10], //-z
    ];

    directions.forEach((dir, index) => {
      const pointLight = new THREE.PointLight(
        0xffffff,
        lightIntensity,
        lightDistance
      );
      pointLight.position.set(...dir);
      pointLight.castShadow = true;
      this.scene.add(pointLight);
      pointLight.name = `PointLight_${index}`;
    });

    window.addEventListener("resize", () => {
      const newWidth = viewerContainer.clientWidth;
      const newHeight = viewerContainer.clientHeight;
      this.renderer.setSize(newWidth, newHeight);
      this.camera.aspect = newWidth / newHeight;
      this.camera.updateProjectionMatrix();
    });

    this.animate();
  }

  loadModel(baseName, index) {
    if (this.model) this.scene.remove(this.model);

    const overlay = document.querySelector(
      `${this.container} #loading-overlay`
    );
    if (overlay) overlay.style.display = "flex";

    // 2. 使用 OBJLoader
    const loader = new THREE.OBJLoader();
    
    loader.load(
      `${this.modelPath}/${baseName}${this.modelExtension}`,
      (object) => {
        // OBJLoader 直接返回包含多个 mesh 的 Group
        this.model = object;
        this.scene.add(this.model);

        this.model.traverse((child) => {
          if (child.isMesh) {
              child.visible = true;
              // 给一个默认的稍微带点灰度的材质，纯白色容易过曝看不清几何细节
              child.material = new THREE.MeshStandardMaterial({
                  color: 0x777777,
                  roughness: 0.6,
                  metalness: 0.1
              });
          }
        });

        // Reset camera
        this.camera.position.set(0, 1, 5);

        // 3. 适配 OBJ 的层级结构来生成实例按钮
        if (this.model.children.length > 0) {
          this.createButtons(this.model.children.length);
        }

        if (overlay) overlay.style.display = "none";
      },
      undefined, // onProgress 可以忽略
      (error) => {
        console.error("An error occurred loading the OBJ:", error);
        if (overlay) overlay.style.display = "none";
      }
    );
  }

  changeModelColor(color) {
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.set(color);
        }
      });
    }
  }

  createImageSlider() {
    const sliderContainer = document.querySelector(
      `${this.container} #image-slider`
    );
    
    // 清空现有轮播图避免重复加载
    if (sliderContainer) sliderContainer.innerHTML = '';

    this.modelBaseNames.forEach((baseName, index) => {
      const slide = document.createElement("div");
      slide.classList.add("swiper-slide");

      const img = document.createElement("img");
      img.src = `${this.imagePath}/${baseName}${this.imageExtension}`;
      img.alt = `Model ${index + 1}`;
      img.onclick = () => this.loadModel(baseName, index);

      slide.appendChild(img);
      if (sliderContainer) sliderContainer.appendChild(slide);
    });

    if (!this.swiper) {
      this.swiper = new Swiper(`${this.container} .swiper`, {
        slidesPerView: "auto",
        slidesPerGroup: 2,
        spaceBetween: 10,
        rewind: true,
        navigation: {
          nextEl: `${this.container} .swiper-button-next`,
          prevEl: `${this.container} .swiper-button-prev`,
        },
      });
    }
  }

  // createButtons(length) {
  //   const controlsDiv = document.querySelector(
  //     `${this.container} #button-block`
  //   );
  //   if (!controlsDiv) return;

  //   const buttons = controlsDiv.querySelectorAll("button");
  //   buttons.forEach((button) => button.remove());

  //   for (let i = 0; i < length; i++) {
  //     const button = document.createElement("button");
  //     button.textContent = `Show Instance ${i + 1}`;
  //     button.onclick = () => this.showPart(i);
  //     controlsDiv.appendChild(button);
  //   }

  //   // Add "Show All" button
  //   const showAllButton = document.createElement("button");
  //   showAllButton.textContent = "Show All";
  //   showAllButton.onclick = () => this.showAll();
  //   controlsDiv.appendChild(showAllButton);
  // }

  // 4. 适配 OBJ 的层级结构来切换实例可见性
  showPart(index) {
    if (this.model) {
      for (let i = 0; i < this.model.children.length; i++) {
        this.model.children[i].visible = (i === index);
      }
    }
  }

  showAll() {
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) child.visible = true;
      });
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
    }
  }
}