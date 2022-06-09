import os
import sys
import shutil
import platform
import subprocess


bits, linkage = platform.architecture()
is_windows = linkage == 'WindowsPE'
cwd = os.path.dirname(__file__) or os.getcwd()
os.chdir(cwd)

if is_windows:
    if '--mingw' in sys.argv[1:]:  # MinGW
        sdl2_path = os.path.join(
            cwd,
            'SDL2'
        )
        sdl2_ttf_path = os.path.join(
            cwd,
            'SDL2_ttf'
        )
        if not os.path.isdir(sdl2_path):
            print(f'Could not find SDL2: {sdl2_path}')
            sys.exit(1)
        if not os.path.isdir(sdl2_ttf_path):
            print(f'Could not find SDL2_ttf: {sdl2_ttf_path}')
            sys.exit(1)
        sdl2_ttf_h = os.path.join(
            sdl2_path,
            'include',
            'SDL2',
            'SDL_ttf.h'
        )
        if not os.path.isfile(sdl2_ttf_h):
            shutil.copyfile(os.path.join(
                sdl2_ttf_path,
                'include',
                'SDL2',
                'SDL_ttf.h'
            ), sdl2_ttf_h)
        sdl2_flags = [
            '-I',
            os.path.join(
                sdl2_path,
                'include'
            ),
            '-L',
            os.path.join(
                sdl2_path,
                'lib'
            ),
            '-L',
            os.path.join(
                sdl2_ttf_path,
                'lib'
            ),
            '-lSDL2',
            '-lSDL2_ttf',
            '-mwindows',
            '-lmingw32',
        ]
    else:  # MSYS2
        sdl2_flags = sys.argv[1:]
        if not sdl2_flags:
            print('Usage: python build.py $(sdl2-config --cflags --libs)')
            sys.exit(1)
        sdl2_flags.append('-lSDL2_ttf')
else:
    if not os.getenv('SDL2_FLAGS'):
        print('Please, set SDL2 flags before: ')
        print('export "SDL2_FLAGS=$(sdl2-config --cflags --libs) -lSDL2_ttf"')
        sys.exit(1)
    sdl2_flags = os.getenv('SDL2_FLAGS').split(' ')

extern_path = os.path.join(
    cwd,
    '..',
    'external'
)
if not os.path.isdir(extern_path):
    os.mkdir(extern_path)
compiler = os.getenv('CC') or 'g++'
input_files = [
    os.path.join(cwd, _x) for _x in os.listdir(cwd)
    if _x.lower().endswith('.cpp')
]
include_path = os.path.join(
    cwd,
    'include'
)
output_ext = 'dll' if is_windows else 'so'
output_file = os.path.join(
    extern_path,
    f'nodev86.{output_ext}'
)
if os.path.isdir(output_file):
    os.remove(output_file)

result = subprocess.call([
    compiler,
    *input_files,
    '-o',
    output_file,
    '-shared',
    '-fPIC',
    '-I',
    include_path,
    *sdl2_flags
], shell=is_windows)
if result:
    print(f'[{hex(result)}] Failed to compile code!')
    sys.exit(1)
