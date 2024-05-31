import pyautogui
import time


import pyscreeze
import PIL

__PIL_TUPLE_VERSION = tuple(int(x) for x in PIL.__version__.split("."))
pyscreeze.PIL__version__ = __PIL_TUPLE_VERSION


class Bot:
    def __init__(self):
        self.assets_location = './assets/'
        self.log_file = 'coords.txt'
        self.logged_coordinates = self.load_logged_coordinates()
        self.running = True
        self.attack_btn = 'c'
        self.use_btn = 'v'
        self.torch_slot = '9'
        self.pick_slot = '8'
        self.keypress_time = 0.0078

    def load_logged_coordinates(self):
        try:
            with open(self.log_file, 'r') as file:
                lines = file.readlines()
                coordinates = [tuple(map(int, line.strip().split(': ')[1].strip('()').split(', '))) for line in lines]
                return coordinates
        except FileNotFoundError:
            return []

    def locate_image_on_screen(self, image_path, confidence=0.8):
        return pyautogui.locateCenterOnScreen(image_path, confidence=confidence)

    def click(self, key, duration=None):
        if duration is None:
            duration = self.keypress_time
        pyautogui.keyDown(key)
        time.sleep(duration)
        pyautogui.keyUp(key)

    def move(self, direction, duration=1):
        if direction in ['w', 'a', 's', 'd']:
            print(f"Moving {direction} for {duration} seconds...")
            self.click(direction, duration=duration)
        else:
            print(f"Invalid direction: {direction}")

    def change_direction(self, direction='left', duration=0.5):
        if direction in ['left', 'right']:
            print(f"Turning {direction} for {duration} seconds...")
            pyautogui.keyDown(direction)
            time.sleep(duration)
            pyautogui.keyUp(direction)
        else:
            print(f"Invalid turn direction: {direction}")

    def move_away_from_lava(self):
        print("Lava detected! Moving away for 5 seconds...")
        self.move('s', duration=5)
        print("Changing direction after moving away from lava...")
        self.change_direction()

    def log_diamond_coordinates(self, x, y):
        if (x, y) not in self.logged_coordinates:
            with open(self.log_file, 'a') as file:
                file.write(f"Diamond found at: ({x}, {y})\n")
            self.logged_coordinates.append((x, y))
            print(f"Diamond found at: ({x}, {y})")
        else:
            print("Diamond coordinates already logged. Changing direction...")
            self.change_direction()

    def mine(self, duration=2):
        print("Mining...")
        self.click(self.attack_btn, duration=duration)

    def start_game(self):
        print("Unpausing the game...")
        pyautogui.press('esc')
        time.sleep(0.1)

    def locate_lava(self, confidence=0.8):
        lava_images = 2
        lava_found = False
        for i in range(1, lava_images + 1):
            lava_image = self.assets_location + f"lava{i}.png"
            lava_location = self.locate_image_on_screen(lava_image, confidence=confidence)
            if lava_location:
                lava_found = True
        return lava_found

    def locate_diamonds(self, confidence=0.8):
        diamond_images = 2
        diamonds_found = False
        for i in range(1, diamond_images + 1):
            diamond_image = self.assets_location + f"diamonds{i}.png"
            diamond_location = self.locate_image_on_screen(diamond_image, confidence=confidence)
            if diamond_location:
                diamonds_found = True
        return diamonds_found

    def place_torch(self, torch_slot='9'):
        self.click(torch_slot)
        self.click(self.use_btn)
        self.click(self.use_btn)

    def run(self):
        time.sleep(1)
        self.start_game()

        loops = 0
        while self.running:
            if not self.running:
                break

            """
            if self.locate_lava():
                self.move_away_from_lava()
                print('lava!!')
            elif self.locate_diamonds():
                #x, y = pyautogui.position()
                #self.log_diamond_coordinates(x, y)
                print('diamonds!!')
            else:
            """
            #self.mine(duration=1.2) #cobble stone
            self.mine(duration=1.7) # deepslate
            self.move('w', duration=0.0005)
            loops += 1
            if loops > 10:
                self.place_torch()
                self.click(self.pick_slot)
                loops = 0


if __name__ == "__main__":
    bot = Bot()
    bot.run()
