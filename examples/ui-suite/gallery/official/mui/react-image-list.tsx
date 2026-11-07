import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';

export default function StandardImageList() {
  return (
    <ImageList sx={{ width: 500, height: 450 }} cols={3} rowHeight={164}>
      {itemData.map((item) => (
        <ImageListItem key={item.img}>
          <img
            srcSet={`${item.img}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
            src={`${item.img}?w=164&h=164&fit=crop&auto=format`}
            alt={item.title}
            loading="lazy"
          />
        </ImageListItem>
      ))}
    </ImageList>
  );
}

const itemData = [
  {
    img: '/mui/favicon.svg',
    title: 'Breakfast',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Burger',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Camera',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Coffee',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Hats',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Honey',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Basketball',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Fern',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Mushrooms',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Tomato basil',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Sea star',
  },
  {
    img: '/mui/favicon.svg',
    title: 'Bike',
  },
];
