'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  const gui = new GUI();

  const fov = 75;
  const aspect = 2 // 캔버스의 가로 / 세로 비율. 캔버스의 기본 크기가 300 * 150이므로 캔버스 기본 비율과 동일하게 설정한 셈.
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  camera.position.z = 2;

  const scene = new THREE.Scene();

  // near, far, 안개 색상, 배경 색상값을 dat.GUI로 받을 수 있도록 도와주는 헬퍼 클래스
  // 또한 near setter, far setter를 이용하여 far값이 near보다 작아지지 않도록, near값이 far값보다 커지지 않도록 해줌.  
  class FogGUIHelper {
    constructor(fog, backgroundColor) {
      this.fog = fog;
      this.backgroundColor = backgroundColor;
    }

    get near() {
      return this.fog.near;
    }

    set near(v) {
      this.fog.near = v;
      this.fog.far = Math.max(this.fog.far, v);
      // far값이 dat.GUI로부터 할당받은 near값(v)보다 작다면 그냥 v값을 할당해버리라는 뜻.
      // 즉, far값이 아무리 작더라도 near보다는 작아질 수 없도록 한거임. 
    }

    get far() {
      return this.fog.far;
    }

    set far(v) {
      this.fog.far = v;
      this.fog.near = Math.min(this.fog.near, v);
    }

    get color() {
      return `#${this.fog.color.getHexString()}`;
    }

    set color(hexString) {
      this.fog.color.set(hexString);
      this.backgroundColor.set(hexString);
    }
  }

  // 씬을 생성한 뒤 scene.fog 속성에 Fog 객체를 생성하여 지정함.
  {
    const near = 1;
    const far = 2; // 여기의 near, far값은 카메라의 near, far값과 별개이고, 카메라의 위치로부터 near, far을 계산하여 안개 효과를 적용하는거임.
    const color = 'lightblue';
    scene.fog = new THREE.Fog(color, near, far);
    // 안개는 '렌더링되는 물체'이므로(안개를 배경 전체에 깔아주거나 하는 게 아니라는 뜻), 물체의 픽셀을 렌더링할 때 같이 렌더링 처리하는데
    // 씬에서 특정 색상의 안개 효과를 주려면, 씬의 배경색도 안개 색과 동일하게 지정해줘야 함.
    scene.background = new THREE.Color(color);

    const fogGUIHelper = new FogGUIHelper(scene.fog, scene.background);
    // 참고로 여기서 사용된 near, far은 이 block 맨 상단에서 할당해준 const near, far 안의 숫자값들을 할당해준 거임.
    // 즉, dat.GUI로부터 1 ~ 2 사이의 값을 입력받을 수 있도록 한 것.
    gui.add(fogGUIHelper, 'near', near, far).listen();
    gui.add(fogGUIHelper, 'far', near, far).listen();
    // 참고로 listen() 메소드를 사용하는 이유는 해당 dat.GUI 입력폼 외에 다른 요소가 해당 속성값을 변화시킬 때,
    // 그 변화된 속성값을 감지하여 입력폼에 업데이트하기 위해 호출해주는 것인데, 
    // 위에 FogGUIHelper 클래스를 보면 near setter에서도 far값을 바꾸고, far setter에서도 near값을 바꾸기 때문에,
    // near, far 입력폼 둘다 서로 상대방의 입력폼으로부터 자신의 속성값을 변화시키기 때문에, 이를 감지하여 입력폼에 업데이트 하고자 listen() 메소드를 호출한 것임.
    gui.addColor(fogGUIHelper, 'color'); // addColor는 dat.GUI에 color picker 입력폼을 추가하는 거 알지?
  }

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function makeInstance(geometry, color, x) {
    const material = new THREE.MeshPhongMaterial({
      color
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  const cubes = [
    makeInstance(geometry, 0x44aa88, 0),
    makeInstance(geometry, 0x8844aa, -2),
    makeInstance(geometry, 0xaa8844, 2),
  ];

  /**
   * three.js에서 레티나 디스플레이를 다루는 방법
   * (공식 문서에는 HD-DPI를 다루는 법이라고 나와있음.)
   * 
   * renderer.setPixelRatio(window.devicePixelRatio);
   * 
   * 위에 메소드를 사용해서 캔버스의 픽셀 사이즈를 CSS 사이즈에 맟출수도 있지만, 
   * 공식 문서에서는 추천하지 않는다고 함.
   * 
   * 그냥 아래와 같이 pixelRatio값을 직접 구한 뒤에 clientWidth,Height에 곱해주는 게 훨씬 낫다고 함.
   * 원래 2d canvas에 할때도 이렇게 했으니 하던대로 하면 될 듯.
   * 
   * 자세한 내용은 공식 문서 참고...
   */
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;

    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  function animate(t) {
    // 타임스탬프 값이 16.~~ms 이런식으로 밀리세컨드 단위로 리턴받는거를 0.016~~s의 세컨드 단위로 변환하려는 거.
    // 이제 매 프레임마다 갱신되는 세컨드 단위의 타임스탬프 값만큼 해당 mesh의 x축과 y축을 회전시키겠다는 거임.
    t *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, index) => {
      const speed = 1 + index * 0.1;
      const rotate = t * speed;
      cube.rotation.x = rotate;
      cube.rotation.y = rotate;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();