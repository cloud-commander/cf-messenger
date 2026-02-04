import type { Avatar } from "../types";
import { getAssetUrl } from "../config/assets";

export const AVATARS: Avatar[] = [
  { id: "av_1", name: "Butterfly", imageUrl: getAssetUrl("/butterfly.png") },
  {
    id: "av_2",
    name: "Beach Chairs",
    imageUrl: getAssetUrl("/default-profile-pictures/beach_chairs.png"),
  },
  {
    id: "av_3",
    name: "Chess Pieces",
    imageUrl: getAssetUrl("/default-profile-pictures/chess_pieces.png"),
  },
  {
    id: "av_4",
    name: "Dirt Bike",
    imageUrl: getAssetUrl("/default-profile-pictures/dirt_bike.png"),
  },
  {
    id: "av_5",
    name: "Friendly Dog",
    imageUrl: getAssetUrl("/default-profile-pictures/friendly_dog.png"),
  },
  {
    id: "av_6",
    name: "Orange Daisy",
    imageUrl: getAssetUrl("/default-profile-pictures/orange_daisy.png"),
  },
  {
    id: "av_7",
    name: "Palm Trees",
    imageUrl: getAssetUrl("/default-profile-pictures/palm_trees.png"),
  },
  {
    id: "av_8",
    name: "Rocket Launch",
    imageUrl: getAssetUrl("/default-profile-pictures/rocket_launch.png"),
  },
  {
    id: "av_9",
    name: "Rubber Ducky",
    imageUrl: getAssetUrl("/default-profile-pictures/rubber_ducky.png"),
  },
  {
    id: "av_10",
    name: "Running Horses",
    imageUrl: getAssetUrl("/default-profile-pictures/running_horses.png"),
  },
  {
    id: "av_11",
    name: "Skateboarder",
    imageUrl: getAssetUrl("/default-profile-pictures/skateboarder.png"),
  },
  {
    id: "av_12",
    name: "Soccer Ball",
    imageUrl: getAssetUrl("/default-profile-pictures/soccer_ball.png"),
  },
  {
    id: "av_bot_skater",
    name: "Skater Girl",
    imageUrl: getAssetUrl("/bot_skater_girl.png"),
  },
  { id: "av_bot_matt", name: "Matt", imageUrl: getAssetUrl("/bot_matt.png") },
  {
    id: "av_bot_jeeves",
    name: "Ask Jeeves",
    imageUrl: getAssetUrl("/default-profile-pictures/ask.png"),
  },
  {
    id: "av_bot_zerocool",
    name: "ZeroCool",
    imageUrl: getAssetUrl("/bot_zerocool.png"),
  },
  {
    id: "av_bot_euphoria",
    name: "Euphoria",
    imageUrl: getAssetUrl("/bot_euphoria.png"),
  },
  { id: "av_bot_tom", name: "Tom", imageUrl: getAssetUrl("/bot_tom.png") },
  { id: "av_bot_hal", name: "HAL", imageUrl: getAssetUrl("/bot_hal.png") },
  {
    id: "av_bot_clippy",
    name: "Clippy",
    imageUrl: getAssetUrl("/bot_clippy.png"),
  },
];
