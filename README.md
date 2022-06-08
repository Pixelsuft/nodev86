# NodeV86
v86 on nodejs + sdl2
# Screenshots
![1](https://user-images.githubusercontent.com/68371847/170811290-a021e0c2-e027-4f1c-a316-6016f9d4409f.png) <br />
![2](https://user-images.githubusercontent.com/68371847/170811291-a1d0a4f7-e7fd-494e-b498-ac8b78ce722e.png) <br />
![3](https://user-images.githubusercontent.com/68371847/170811292-da0f1d7f-46ab-415e-bad8-4a6dd65aab76.png) <br />
(Yes, I switched to Windows 11) <br />
![4](https://user-images.githubusercontent.com/68371847/171554543-8dbbd2e4-f789-488d-84d4-2ab676ba4ab8.png) <br />
![5](https://user-images.githubusercontent.com/68371847/171994517-b6bec495-cdd5-4732-b1e0-28d5f2c01a0e.png) <br />
![6](https://user-images.githubusercontent.com/68371847/171994518-69b5f2b2-aa4b-421b-ac26-735927ffd543.png) <br />
![7](https://user-images.githubusercontent.com/68371847/171852149-0440a978-a5dd-4bb7-b4d5-34b723d4d50e.png) <br />
![8](https://user-images.githubusercontent.com/68371847/171556875-3d228a0f-d213-494a-8771-9f4972517fb5.png) <br />
![9](https://user-images.githubusercontent.com/68371847/171573355-ded15c49-d23b-4867-88a8-a25f6a05afe5.png)
# Building and Running
Note: To build on windows, use mingw64 (`--mingw` flag) or msys2 <br />
1) Build .dll/.so library using `build.py` script in src folder <br />
2) Install nodejs packages with `npm i` <br />
3) Configure `config.js` <br />
4) Run with `npm start` or `node index`
# Custom Configs
1) Create `configs` folder and place configs <br />
2) Run `node index config_name_here` (config name without `configs/` and `.js`) <br />
For example, `node index msdos` for `configs/msdos.js`
